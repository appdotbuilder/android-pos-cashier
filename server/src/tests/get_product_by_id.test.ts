
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProductById } from '../handlers/get_product_by_id';

const testProduct: CreateProductInput = {
  name: 'Test Product',
  barcode: '1234567890',
  purchase_price: 10.50,
  selling_price: 19.99,
  stock_quantity: 100
};

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return product when it exists', async () => {
    // Create a test product
    const insertResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        purchase_price: testProduct.purchase_price.toString(),
        selling_price: testProduct.selling_price.toString(),
        stock_quantity: testProduct.stock_quantity
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Get the product by ID
    const result = await getProductById(createdProduct.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Test Product');
    expect(result!.barcode).toEqual('1234567890');
    expect(result!.purchase_price).toEqual(10.50);
    expect(typeof result!.purchase_price).toEqual('number');
    expect(result!.selling_price).toEqual(19.99);
    expect(typeof result!.selling_price).toEqual('number');
    expect(result!.stock_quantity).toEqual(100);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when product does not exist', async () => {
    const result = await getProductById(999);

    expect(result).toBeNull();
  });

  it('should handle product with null barcode', async () => {
    // Create a test product without barcode
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Product Without Barcode',
        barcode: null,
        purchase_price: testProduct.purchase_price.toString(),
        selling_price: testProduct.selling_price.toString(),
        stock_quantity: testProduct.stock_quantity
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Get the product by ID
    const result = await getProductById(createdProduct.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Product Without Barcode');
    expect(result!.barcode).toBeNull();
    expect(result!.purchase_price).toEqual(10.50);
    expect(result!.selling_price).toEqual(19.99);
  });
});
