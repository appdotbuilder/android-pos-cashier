
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductSearchInput, type Product } from '../schema';
import { or, ilike, eq } from 'drizzle-orm';

export async function searchProducts(input: ProductSearchInput): Promise<Product[]> {
  try {
    // Build conditions array for OR logic
    const conditions = [];

    // Add partial name matching if query provided
    if (input.query && input.query.trim().length > 0) {
      conditions.push(ilike(productsTable.name, `%${input.query.trim()}%`));
    }

    // Add exact barcode matching if barcode provided
    if (input.barcode && input.barcode.trim().length > 0) {
      conditions.push(eq(productsTable.barcode, input.barcode.trim()));
    }

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select().from(productsTable).where(or(...conditions)).execute()
      : await db.select().from(productsTable).execute();

    // Convert numeric fields from strings to numbers
    return results.map(product => ({
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Product search failed:', error);
    throw error;
  }
}
