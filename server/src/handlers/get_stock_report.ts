
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type StockReport } from '../schema';

export async function getStockReport(): Promise<StockReport[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    return results.map(product => {
      const purchasePrice = parseFloat(product.purchase_price);
      const stockValue = product.stock_quantity * purchasePrice;
      
      return {
        product_id: product.id,
        product_name: product.name,
        current_stock: product.stock_quantity,
        purchase_price: purchasePrice,
        selling_price: parseFloat(product.selling_price),
        stock_value: Math.round(stockValue * 100) / 100 // Round to 2 decimal places
      };
    });
  } catch (error) {
    console.error('Stock report generation failed:', error);
    throw error;
  }
}
