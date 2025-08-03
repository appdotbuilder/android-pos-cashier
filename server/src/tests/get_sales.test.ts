
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTable, saleItemsTable } from '../db/schema';
import { getSales } from '../handlers/get_sales';

describe('getSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const result = await getSales();
    expect(result).toEqual([]);
  });

  it('should fetch sales with their items', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: 'TEST123',
        purchase_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    
    const product = productResult[0];

    // Create test sale
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '30.00',
        amount_paid: '35.00',
        change_amount: '5.00'
      })
      .returning()
      .execute();
    
    const sale = saleResult[0];

    // Create sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale.id,
          product_id: product.id,
          quantity: 2,
          unit_price: '15.00',
          total_price: '30.00',
          product_name: 'Test Product'
        }
      ])
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(sale.id);
    expect(result[0].total_amount).toEqual(30.00);
    expect(result[0].amount_paid).toEqual(35.00);
    expect(result[0].change_amount).toEqual(5.00);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].product_id).toEqual(product.id);
    expect(result[0].items[0].quantity).toEqual(2);
    expect(result[0].items[0].unit_price).toEqual(15.00);
    expect(result[0].items[0].total_price).toEqual(30.00);
    expect(result[0].items[0].product_name).toEqual('Test Product');
  });

  it('should return sales ordered by creation date (newest first)', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: 'TEST123',
        purchase_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    
    const product = productResult[0];

    // Create multiple sales with slight delay to ensure different timestamps
    const firstSale = await db.insert(salesTable)
      .values({
        total_amount: '15.00',
        amount_paid: '20.00',
        change_amount: '5.00'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondSale = await db.insert(salesTable)
      .values({
        total_amount: '30.00',
        amount_paid: '30.00',
        change_amount: '0.00'
      })
      .returning()
      .execute();

    // Add items to both sales
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: firstSale[0].id,
          product_id: product.id,
          quantity: 1,
          unit_price: '15.00',
          total_price: '15.00',
          product_name: 'Test Product'
        },
        {
          sale_id: secondSale[0].id,
          product_id: product.id,
          quantity: 2,
          unit_price: '15.00',
          total_price: '30.00',
          product_name: 'Test Product'
        }
      ])
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(2);
    // Second sale should come first (newest first)
    expect(result[0].id).toEqual(secondSale[0].id);
    expect(result[0].total_amount).toEqual(30.00);
    expect(result[1].id).toEqual(firstSale[0].id);
    expect(result[1].total_amount).toEqual(15.00);
    // Verify ordering by timestamp
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
  });

  it('should handle sales with no items', async () => {
    // Create sale without items
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '0.00',
        amount_paid: '0.00',
        change_amount: '0.00'
      })
      .returning()
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(saleResult[0].id);
    expect(result[0].items).toEqual([]);
  });

  it('should handle multiple items per sale', async () => {
    // Create test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          barcode: 'A123',
          purchase_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product B',
          barcode: 'B123',
          purchase_price: '5.00',
          selling_price: '8.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    // Create sale
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '46.00',
        amount_paid: '50.00',
        change_amount: '4.00'
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    // Create multiple sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale.id,
          product_id: productResults[0].id,
          quantity: 2,
          unit_price: '15.00',
          total_price: '30.00',
          product_name: 'Product A'
        },
        {
          sale_id: sale.id,
          product_id: productResults[1].id,
          quantity: 2,
          unit_price: '8.00',
          total_price: '16.00',
          product_name: 'Product B'
        }
      ])
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
    
    // Verify all items are correctly included
    const itemProductIds = result[0].items.map(item => item.product_id).sort();
    expect(itemProductIds).toEqual([productResults[0].id, productResults[1].id].sort());
    
    // Verify numeric conversions
    result[0].items.forEach(item => {
      expect(typeof item.unit_price).toBe('number');
      expect(typeof item.total_price).toBe('number');
    });
  });
});
