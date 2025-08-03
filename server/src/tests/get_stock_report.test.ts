
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getStockReport } from '../handlers/get_stock_report';

describe('getStockReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getStockReport();
    expect(result).toEqual([]);
  });

  it('should return stock report for single product', async () => {
    // Create test product
    await db.insert(productsTable).values({
      name: 'Test Product',
      barcode: '123456789',
      purchase_price: '10.50',
      selling_price: '15.99',
      stock_quantity: 25
    }).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe('Test Product');
    expect(result[0].current_stock).toBe(25);
    expect(result[0].purchase_price).toBe(10.50);
    expect(result[0].selling_price).toBe(15.99);
    expect(result[0].stock_value).toBe(262.50); // 25 * 10.50
    expect(result[0].product_id).toBeDefined();
  });

  it('should return stock report for multiple products', async () => {
    // Create multiple test products
    await db.insert(productsTable).values([
      {
        name: 'Product A',
        barcode: '111111111',
        purchase_price: '5.00',
        selling_price: '8.00',
        stock_quantity: 10
      },
      {
        name: 'Product B',
        barcode: null,
        purchase_price: '12.75',
        selling_price: '20.00',
        stock_quantity: 8
      }
    ]).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(2);
    
    // Find products by name for consistent testing
    const productA = result.find(p => p.product_name === 'Product A');
    const productB = result.find(p => p.product_name === 'Product B');

    expect(productA).toBeDefined();
    expect(productA!.current_stock).toBe(10);
    expect(productA!.purchase_price).toBe(5.00);
    expect(productA!.selling_price).toBe(8.00);
    expect(productA!.stock_value).toBe(50.00); // 10 * 5.00

    expect(productB).toBeDefined();
    expect(productB!.current_stock).toBe(8);
    expect(productB!.purchase_price).toBe(12.75);
    expect(productB!.selling_price).toBe(20.00);
    expect(productB!.stock_value).toBe(102.00); // 8 * 12.75
  });

  it('should handle products with zero stock', async () => {
    // Create product with zero stock
    await db.insert(productsTable).values({
      name: 'Out of Stock Product',
      barcode: '000000000',
      purchase_price: '7.25',
      selling_price: '12.99',
      stock_quantity: 0
    }).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe('Out of Stock Product');
    expect(result[0].current_stock).toBe(0);
    expect(result[0].purchase_price).toBe(7.25);
    expect(result[0].selling_price).toBe(12.99);
    expect(result[0].stock_value).toBe(0.00); // 0 * 7.25
  });

  it('should calculate stock values correctly with decimal prices', async () => {
    // Create product with decimal prices
    await db.insert(productsTable).values({
      name: 'Decimal Product',
      barcode: '999999999',
      purchase_price: '3.33',
      selling_price: '4.99',
      stock_quantity: 7
    }).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe('Decimal Product');
    expect(result[0].current_stock).toBe(7);
    expect(result[0].purchase_price).toBe(3.33);
    expect(result[0].selling_price).toBe(4.99);
    expect(result[0].stock_value).toBe(23.31); // 7 * 3.33
  });
});
