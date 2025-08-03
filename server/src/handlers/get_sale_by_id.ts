
import { db } from '../db';
import { salesTable, saleItemsTable } from '../db/schema';
import { type SaleWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export const getSaleById = async (id: number): Promise<SaleWithItems | null> => {
  try {
    // First get the sale record
    const sales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, id))
      .execute();

    if (sales.length === 0) {
      return null;
    }

    const sale = sales[0];

    // Then get all sale items for this sale
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, id))
      .execute();

    // Convert numeric fields and return the complete sale with items
    return {
      id: sale.id,
      total_amount: parseFloat(sale.total_amount),
      amount_paid: parseFloat(sale.amount_paid),
      change_amount: parseFloat(sale.change_amount),
      created_at: sale.created_at,
      items: saleItems.map(item => ({
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
    console.error('Failed to get sale by ID:', error);
    throw error;
  }
};
