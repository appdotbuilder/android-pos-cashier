
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, stockAdjustmentsTable } from '../db/schema';
import { getStockAdjustments } from '../handlers/get_stock_adjustments';

describe('getStockAdjustments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no adjustments exist', async () => {
    const result = await getStockAdjustments();
    expect(result).toEqual([]);
  });

  it('should return all stock adjustments ordered by newest first', async () => {
    // Create a test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: '123456789',
        purchase_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create test adjustments with different timestamps
    const adjustment1 = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: productId,
        adjustment_type: 'ADD',
        quantity: 50,
        reason: 'Initial stock'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const adjustment2 = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: productId,
        adjustment_type: 'REDUCE',
        quantity: 25,
        reason: 'Damaged goods'
      })
      .returning()
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(2);
    
    // Should be ordered by newest first
    expect(result[0].id).toBe(adjustment2[0].id);
    expect(result[1].id).toBe(adjustment1[0].id);

    // Verify first adjustment (newest)
    expect(result[0].product_id).toBe(productId);
    expect(result[0].adjustment_type).toBe('REDUCE');
    expect(result[0].quantity).toBe(25);
    expect(result[0].reason).toBe('Damaged goods');
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second adjustment (older)
    expect(result[1].product_id).toBe(productId);
    expect(result[1].adjustment_type).toBe('ADD');
    expect(result[1].quantity).toBe(50);
    expect(result[1].reason).toBe('Initial stock');
    expect(result[1].created_at).toBeInstanceOf(Date);

    // Verify ordering by date
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should handle adjustments with null reason', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: null,
        purchase_price: '5.99',
        selling_price: '9.99',
        stock_quantity: 0
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create adjustment without reason
    await db.insert(stockAdjustmentsTable)
      .values({
        product_id: productId,
        adjustment_type: 'ADD',
        quantity: 100,
        reason: null
      })
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe(productId);
    expect(result[0].adjustment_type).toBe('ADD');
    expect(result[0].quantity).toBe(100);
    expect(result[0].reason).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple adjustments for different products', async () => {
    // Create two test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        barcode: '111111111',
        purchase_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 50
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        barcode: '222222222',
        purchase_price: '20.00',
        selling_price: '30.00',
        stock_quantity: 25
      })
      .returning()
      .execute();

    const product1Id = product1Result[0].id;
    const product2Id = product2Result[0].id;

    // Create adjustments for both products
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          product_id: product1Id,
          adjustment_type: 'ADD',
          quantity: 30,
          reason: 'Restock product 1'
        },
        {
          product_id: product2Id,
          adjustment_type: 'REDUCE',
          quantity: 5,
          reason: 'Damaged product 2'
        }
      ])
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(2);
    
    // Find adjustments by product_id
    const product1Adjustment = result.find(adj => adj.product_id === product1Id);
    const product2Adjustment = result.find(adj => adj.product_id === product2Id);

    expect(product1Adjustment).toBeDefined();
    expect(product1Adjustment!.adjustment_type).toBe('ADD');
    expect(product1Adjustment!.quantity).toBe(30);
    expect(product1Adjustment!.reason).toBe('Restock product 1');

    expect(product2Adjustment).toBeDefined();
    expect(product2Adjustment!.adjustment_type).toBe('REDUCE');
    expect(product2Adjustment!.quantity).toBe(5);
    expect(product2Adjustment!.reason).toBe('Damaged product 2');
  });
});
