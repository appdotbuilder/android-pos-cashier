
import { db } from '../db';
import { salesTable, saleItemsTable } from '../db/schema';
import { type SaleWithItems } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getSales(): Promise<SaleWithItems[]> {
  try {
    // Get all sales ordered by creation date (newest first)
    const sales = await db.select()
      .from(salesTable)
      .orderBy(desc(salesTable.created_at))
      .execute();

    // Get all sale items for all sales
    const saleItems = await db.select()
      .from(saleItemsTable)
      .execute();

    // Group sale items by sale_id for efficient lookup
    const itemsBySaleId = new Map<number, typeof saleItems>();
    saleItems.forEach(item => {
      const saleId = item.sale_id;
      if (!itemsBySaleId.has(saleId)) {
        itemsBySaleId.set(saleId, []);
      }
      itemsBySaleId.get(saleId)!.push(item);
    });

    // Combine sales with their items and convert numeric fields
    return sales.map(sale => ({
      id: sale.id,
      total_amount: parseFloat(sale.total_amount),
      amount_paid: parseFloat(sale.amount_paid),
      change_amount: parseFloat(sale.change_amount),
      created_at: sale.created_at,
      items: (itemsBySaleId.get(sale.id) || []).map(item => ({
        id: item.id,
        sale_id: item.sale_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        product_name: item.product_name
      }))
    }));
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    throw error;
  }
}
