
import { db } from '../db';
import { productsTable, salesTable, saleItemsTable } from '../db/schema';
import { type CreateSaleInput, type SaleWithItems } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export async function createSale(input: CreateSaleInput): Promise<SaleWithItems> {
  try {
    // 1. Get all unique product IDs from items
    const productIds = [...new Set(input.items.map(item => item.product_id))];
    
    // 2. Validate all products exist and fetch their current data
    const products = await db.select()
      .from(productsTable)
      .where(inArray(productsTable.id, productIds))
      .execute();

    if (products.length !== productIds.length) {
      throw new Error('One or more products not found');
    }

    // Create a map for quick product lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // 3. Calculate total quantities per product for stock validation
    const productQuantities = new Map<number, number>();
    for (const item of input.items) {
      const currentQty = productQuantities.get(item.product_id) || 0;
      productQuantities.set(item.product_id, currentQty + item.quantity);
    }

    // 4. Validate stock availability for total quantities
    for (const [productId, totalQuantity] of productQuantities) {
      const product = productMap.get(productId)!;
      if (product.stock_quantity < totalQuantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${totalQuantity}`);
      }
    }

    // 5. Calculate totals and prepare sale items data
    let totalAmount = 0;
    const saleItemsData = [];

    for (const item of input.items) {
      const product = productMap.get(item.product_id)!;
      const unitPrice = parseFloat(product.selling_price);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      saleItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        product_name: product.name
      });
    }

    // 6. Calculate change amount
    const changeAmount = Math.max(0, input.amount_paid - totalAmount);

    // 7. Create sale record
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: totalAmount.toString(),
        amount_paid: input.amount_paid.toString(),
        change_amount: changeAmount.toString()
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    // 8. Create sale items
    const saleItemsToInsert = saleItemsData.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      total_price: item.total_price.toString(),
      product_name: item.product_name
    }));

    const saleItemsResult = await db.insert(saleItemsTable)
      .values(saleItemsToInsert)
      .returning()
      .execute();

    // 9. Update product stock quantities (using aggregated quantities)
    for (const [productId, totalQuantity] of productQuantities) {
      const product = productMap.get(productId)!;
      const newStock = product.stock_quantity - totalQuantity;
      
      await db.update(productsTable)
        .set({ 
          stock_quantity: newStock,
          updated_at: new Date()
        })
        .where(eq(productsTable.id, productId))
        .execute();
    }

    // 10. Return complete sale with items
    return {
      id: sale.id,
      total_amount: parseFloat(sale.total_amount),
      amount_paid: parseFloat(sale.amount_paid),
      change_amount: parseFloat(sale.change_amount),
      created_at: sale.created_at,
      items: saleItemsResult.map(item => ({
        id: item.id,
        sale_id: item.sale_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        product_name: item.product_name
      }))
    };

  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
}
