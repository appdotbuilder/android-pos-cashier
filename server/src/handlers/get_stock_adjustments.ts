
import { db } from '../db';
import { stockAdjustmentsTable } from '../db/schema';
import { type StockAdjustment } from '../schema';
import { desc } from 'drizzle-orm';

export async function getStockAdjustments(): Promise<StockAdjustment[]> {
  try {
    const results = await db.select()
      .from(stockAdjustmentsTable)
      .orderBy(desc(stockAdjustmentsTable.created_at))
      .execute();

    return results.map(adjustment => ({
      ...adjustment,
      // No numeric columns need conversion - all fields are correct types
      id: adjustment.id,
      product_id: adjustment.product_id,
      adjustment_type: adjustment.adjustment_type,
      quantity: adjustment.quantity,
      reason: adjustment.reason,
      created_at: adjustment.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch stock adjustments:', error);
    throw error;
  }
}
