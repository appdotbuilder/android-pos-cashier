
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products with correct data types', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          barcode: 'BAR001',
          purchase_price: '10.50',
          selling_price: '15.99',
          stock_quantity: 100
        },
        {
          name: 'Product 2',
          barcode: null,
          purchase_price: '5.25',
          selling_price: '8.00',
          stock_quantity: 50
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);

    // Verify first product
    const product1 = result.find(p => p.name === 'Product 1');
    expect(product1).toBeDefined();
    expect(product1!.barcode).toEqual('BAR001');
    expect(product1!.purchase_price).toEqual(10.50);
    expect(product1!.selling_price).toEqual(15.99);
    expect(product1!.stock_quantity).toEqual(100);
    expect(typeof product1!.purchase_price).toBe('number');
    expect(typeof product1!.selling_price).toBe('number');
    expect(product1!.id).toBeDefined();
    expect(product1!.created_at).toBeInstanceOf(Date);
    expect(product1!.updated_at).toBeInstanceOf(Date);

    // Verify second product
    const product2 = result.find(p => p.name === 'Product 2');
    expect(product2).toBeDefined();
    expect(product2!.barcode).toBeNull();
    expect(product2!.purchase_price).toEqual(5.25);
    expect(product2!.selling_price).toEqual(8.00);
    expect(product2!.stock_quantity).toEqual(50);
    expect(typeof product2!.purchase_price).toBe('number');
    expect(typeof product2!.selling_price).toBe('number');
  });

  it('should return products ordered by insertion order', async () => {
    // Create products in specific order
    const firstProduct = await db.insert(productsTable)
      .values({
        name: 'First Product',
        barcode: 'FIRST',
        purchase_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 10
      })
      .returning()
      .execute();

    const secondProduct = await db.insert(productsTable)
      .values({
        name: 'Second Product',
        barcode: 'SECOND',
        purchase_price: '20.00',
        selling_price: '25.00',
        stock_quantity: 20
      })
      .returning()
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(firstProduct[0].id);
    expect(result[1].id).toEqual(secondProduct[0].id);
    expect(result[0].name).toEqual('First Product');
    expect(result[1].name).toEqual('Second Product');
  });
});
