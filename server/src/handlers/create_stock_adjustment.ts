
import { db } from '../db';
import { productsTable, stockAdjustmentsTable } from '../db/schema';
import { type CreateStockAdjustmentInput, type StockAdjustment } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStockAdjustment(input: CreateStockAdjustmentInput): Promise<StockAdjustment> {
  try {
    // Validate product exists and get current stock
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (products.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    const product = products[0];
    const currentStock = product.stock_quantity;

    // For REDUCE adjustments, ensure sufficient stock
    if (input.adjustment_type === 'REDUCE' && currentStock < input.quantity) {
      throw new Error(`Insufficient stock. Current stock: ${currentStock}, requested reduction: ${input.quantity}`);
    }

    // Calculate new stock quantity
    const newStockQuantity = input.adjustment_type === 'ADD' 
      ? currentStock + input.quantity
      : currentStock - input.quantity;

    // Update product stock quantity
    await db.update(productsTable)
      .set({ 
        stock_quantity: newStockQuantity,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Record the adjustment for audit trail
    const result = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: input.product_id,
        adjustment_type: input.adjustment_type,
        quantity: input.quantity,
        reason: input.reason
      })
      .returning()
      .execute();

    const adjustment = result[0];
    return {
      ...adjustment,
      created_at: adjustment.created_at || new Date()
    };
  } catch (error) {
    console.error('Stock adjustment creation failed:', error);
    throw error;
  }
}
