
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateProductInput = {
  name: 'Test Product',
  barcode: '1234567890',
  purchase_price: 15.99,
  selling_price: 19.99,
  stock_quantity: 100
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.barcode).toEqual('1234567890');
    expect(result.purchase_price).toEqual(15.99);
    expect(result.selling_price).toEqual(19.99);
    expect(result.stock_quantity).toEqual(100);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].barcode).toEqual('1234567890');
    expect(parseFloat(products[0].purchase_price)).toEqual(15.99);
    expect(parseFloat(products[0].selling_price)).toEqual(19.99);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null barcode', async () => {
    const inputWithNullBarcode: CreateProductInput = {
      ...testInput,
      barcode: null
    };

    const result = await createProduct(inputWithNullBarcode);

    expect(result.barcode).toBeNull();
    expect(result.name).toEqual('Test Product');
    expect(result.purchase_price).toEqual(15.99);
    expect(result.selling_price).toEqual(19.99);
  });

  it('should return correct numeric types', async () => {
    const result = await createProduct(testInput);

    // Verify numeric conversions
    expect(typeof result.purchase_price).toBe('number');
    expect(typeof result.selling_price).toBe('number');
    expect(typeof result.stock_quantity).toBe('number');
    expect(typeof result.id).toBe('number');
  });
});
