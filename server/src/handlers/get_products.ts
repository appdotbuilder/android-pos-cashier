
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};
