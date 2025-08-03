
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Test inputs
const createTestProduct: CreateProductInput = {
  name: 'Original Product',
  barcode: 'ORIGINAL123',
  purchase_price: 10.00,
  selling_price: 15.00,
  stock_quantity: 50
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all product fields', async () => {
    // Create initial product
    const created = await db.insert(productsTable)
      .values({
        name: createTestProduct.name,
        barcode: createTestProduct.barcode,
        purchase_price: createTestProduct.purchase_price.toString(),
        selling_price: createTestProduct.selling_price.toString(),
        stock_quantity: createTestProduct.stock_quantity
      })
      .returning()
      .execute();

    const productId = created[0].id;

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Updated Product',
      barcode: 'UPDATED456',
      purchase_price: 12.50,
      selling_price: 18.99,
      stock_quantity: 75
    };

    const result = await updateProduct(updateInput);

    // Verify all fields updated
    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product');
    expect(result.barcode).toEqual('UPDATED456');
    expect(result.purchase_price).toEqual(12.50);
    expect(result.selling_price).toEqual(18.99);
    expect(result.stock_quantity).toEqual(75);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    // Create initial product
    const created = await db.insert(productsTable)
      .values({
        name: createTestProduct.name,
        barcode: createTestProduct.barcode,
        purchase_price: createTestProduct.purchase_price.toString(),
        selling_price: createTestProduct.selling_price.toString(),
        stock_quantity: createTestProduct.stock_quantity
      })
      .returning()
      .execute();

    const productId = created[0].id;

    const partialUpdate: UpdateProductInput = {
      id: productId,
      name: 'Partially Updated',
      selling_price: 20.00
    };

    const result = await updateProduct(partialUpdate);

    // Verify only specified fields updated
    expect(result.name).toEqual('Partially Updated');
    expect(result.selling_price).toEqual(20.00);
    // Verify other fields unchanged
    expect(result.barcode).toEqual('ORIGINAL123');
    expect(result.purchase_price).toEqual(10.00);
    expect(result.stock_quantity).toEqual(50);
  });

  it('should save updates to database', async () => {
    // Create initial product
    const created = await db.insert(productsTable)
      .values({
        name: createTestProduct.name,
        barcode: createTestProduct.barcode,
        purchase_price: createTestProduct.purchase_price.toString(),
        selling_price: createTestProduct.selling_price.toString(),
        stock_quantity: createTestProduct.stock_quantity
      })
      .returning()
      .execute();

    const productId = created[0].id;

    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Database Updated',
      purchase_price: 8.75
    };

    await updateProduct(updateInput);

    // Verify changes persisted in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    const product = products[0];
    expect(product.name).toEqual('Database Updated');
    expect(parseFloat(product.purchase_price)).toEqual(8.75);
    expect(product.barcode).toEqual('ORIGINAL123'); // Unchanged
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null barcode updates', async () => {
    // Create initial product
    const created = await db.insert(productsTable)
      .values({
        name: createTestProduct.name,
        barcode: createTestProduct.barcode,
        purchase_price: createTestProduct.purchase_price.toString(),
        selling_price: createTestProduct.selling_price.toString(),
        stock_quantity: createTestProduct.stock_quantity
      })
      .returning()
      .execute();

    const productId = created[0].id;

    const updateInput: UpdateProductInput = {
      id: productId,
      barcode: null
    };

    const result = await updateProduct(updateInput);

    expect(result.barcode).toBeNull();

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products[0].barcode).toBeNull();
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    expect(updateProduct(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should return correct numeric types', async () => {
    // Create initial product
    const created = await db.insert(productsTable)
      .values({
        name: createTestProduct.name,
        barcode: createTestProduct.barcode,
        purchase_price: createTestProduct.purchase_price.toString(),
        selling_price: createTestProduct.selling_price.toString(),
        stock_quantity: createTestProduct.stock_quantity
      })
      .returning()
      .execute();

    const productId = created[0].id;

    const updateInput: UpdateProductInput = {
      id: productId,
      purchase_price: 13.33,
      selling_price: 19.99
    };

    const result = await updateProduct(updateInput);

    // Verify numeric types
    expect(typeof result.purchase_price).toBe('number');
    expect(typeof result.selling_price).toBe('number');
    expect(typeof result.stock_quantity).toBe('number');
    expect(result.purchase_price).toEqual(13.33);
    expect(result.selling_price).toEqual(19.99);
  });
});
