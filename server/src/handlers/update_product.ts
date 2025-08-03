
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // Check if product exists first
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.barcode !== undefined) {
      updateData.barcode = input.barcode;
    }
    if (input.purchase_price !== undefined) {
      updateData.purchase_price = input.purchase_price.toString();
    }
    if (input.selling_price !== undefined) {
      updateData.selling_price = input.selling_price.toString();
    }
    if (input.stock_quantity !== undefined) {
      updateData.stock_quantity = input.stock_quantity;
    }

    // Update product record
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      purchase_price: parseFloat(product.purchase_price),
      selling_price: parseFloat(product.selling_price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
