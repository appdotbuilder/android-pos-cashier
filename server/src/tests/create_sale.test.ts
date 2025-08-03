
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTable, saleItemsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test products
  const createTestProducts = async () => {
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          barcode: 'A001',
          purchase_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product B',
          barcode: 'B001',
          purchase_price: '20.00',
          selling_price: '30.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();
    
    return products;
  };

  it('should create a sale with single item', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 2 }
      ],
      amount_paid: 50.00
    };

    const result = await createSale(testInput);

    // Validate sale data
    expect(result.id).toBeDefined();
    expect(result.total_amount).toEqual(30.00); // 2 * 15.00
    expect(result.amount_paid).toEqual(50.00);
    expect(result.change_amount).toEqual(20.00); // 50.00 - 30.00
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.items).toHaveLength(1);

    // Validate sale item
    const item = result.items[0];
    expect(item.id).toBeDefined();
    expect(item.sale_id).toEqual(result.id);
    expect(item.product_id).toEqual(products[0].id);
    expect(item.quantity).toEqual(2);
    expect(item.unit_price).toEqual(15.00);
    expect(item.total_price).toEqual(30.00);
    expect(item.product_name).toEqual('Product A');
  });

  it('should create a sale with multiple items', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 3 },
        { product_id: products[1].id, quantity: 1 }
      ],
      amount_paid: 100.00
    };

    const result = await createSale(testInput);

    // Validate total calculation: (3 * 15.00) + (1 * 30.00) = 75.00
    expect(result.total_amount).toEqual(75.00);
    expect(result.amount_paid).toEqual(100.00);
    expect(result.change_amount).toEqual(25.00);
    expect(result.items).toHaveLength(2);

    // Validate items are correctly mapped
    const productAItem = result.items.find(item => item.product_id === products[0].id);
    const productBItem = result.items.find(item => item.product_id === products[1].id);

    expect(productAItem).toBeDefined();
    expect(productAItem!.quantity).toEqual(3);
    expect(productAItem!.total_price).toEqual(45.00);

    expect(productBItem).toBeDefined();
    expect(productBItem!.quantity).toEqual(1);
    expect(productBItem!.total_price).toEqual(30.00);
  });

  it('should update product stock quantities', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 5 },
        { product_id: products[1].id, quantity: 3 }
      ],
      amount_paid: 200.00
    };

    await createSale(testInput);

    // Check updated stock quantities
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[0].id))
      .execute();

    expect(updatedProducts[0].stock_quantity).toEqual(95); // 100 - 5

    const productB = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[1].id))
      .execute();

    expect(productB[0].stock_quantity).toEqual(47); // 50 - 3
  });

  it('should save sale and items to database', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 1 }
      ],
      amount_paid: 20.00
    };

    const result = await createSale(testInput);

    // Verify sale in database
    const sales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, result.id))
      .execute();

    expect(sales).toHaveLength(1);
    expect(parseFloat(sales[0].total_amount)).toEqual(15.00);
    expect(parseFloat(sales[0].amount_paid)).toEqual(20.00);

    // Verify sale items in database
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(1);
    expect(saleItems[0].product_id).toEqual(products[0].id);
    expect(saleItems[0].quantity).toEqual(1);
    expect(parseFloat(saleItems[0].unit_price)).toEqual(15.00);
  });

  it('should handle exact payment amount', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 2 }
      ],
      amount_paid: 30.00 // Exact amount
    };

    const result = await createSale(testInput);

    expect(result.total_amount).toEqual(30.00);
    expect(result.amount_paid).toEqual(30.00);
    expect(result.change_amount).toEqual(0.00);
  });

  it('should throw error when product does not exist', async () => {
    const testInput: CreateSaleInput = {
      items: [
        { product_id: 999, quantity: 1 }
      ],
      amount_paid: 50.00
    };

    await expect(createSale(testInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error when insufficient stock', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 150 } // More than available stock (100)
      ],
      amount_paid: 50.00
    };

    await expect(createSale(testInput)).rejects.toThrow(/insufficient stock/i);
  });

  it('should handle duplicate product IDs by aggregating quantities for stock check', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 2 },
        { product_id: products[0].id, quantity: 3 } // Same product
      ],
      amount_paid: 100.00
    };

    const result = await createSale(testInput);

    // Should create separate sale items (not combined)
    expect(result.items).toHaveLength(2);
    expect(result.total_amount).toEqual(75.00); // (2 + 3) * 15.00

    // Stock should be reduced by total quantity (2 + 3 = 5)
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[0].id))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(95); // 100 - 5
  });

  it('should throw error when duplicate products exceed stock', async () => {
    const products = await createTestProducts();
    
    const testInput: CreateSaleInput = {
      items: [
        { product_id: products[0].id, quantity: 60 },
        { product_id: products[0].id, quantity: 50 } // Total: 110, but stock is only 100
      ],
      amount_paid: 200.00
    };

    await expect(createSale(testInput)).rejects.toThrow(/insufficient stock/i);
  });
});
