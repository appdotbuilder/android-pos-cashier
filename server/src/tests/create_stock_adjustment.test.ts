
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, stockAdjustmentsTable } from '../db/schema';
import { type CreateStockAdjustmentInput } from '../schema';
import { createStockAdjustment } from '../handlers/create_stock_adjustment';
import { eq } from 'drizzle-orm';

describe('createStockAdjustment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test product
  const createTestProduct = async (stockQuantity = 50) => {
    const result = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: null,
        purchase_price: '10.00',
        selling_price: '15.00',
        stock_quantity: stockQuantity
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create ADD stock adjustment', async () => {
    const product = await createTestProduct(50);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'ADD',
      quantity: 20,
      reason: 'New inventory received'
    };

    const result = await createStockAdjustment(input);

    expect(result.product_id).toEqual(product.id);
    expect(result.adjustment_type).toEqual('ADD');
    expect(result.quantity).toEqual(20);
    expect(result.reason).toEqual('New inventory received');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create REDUCE stock adjustment', async () => {
    const product = await createTestProduct(50);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'REDUCE',
      quantity: 15,
      reason: 'Damaged goods'
    };

    const result = await createStockAdjustment(input);

    expect(result.product_id).toEqual(product.id);
    expect(result.adjustment_type).toEqual('REDUCE');
    expect(result.quantity).toEqual(15);
    expect(result.reason).toEqual('Damaged goods');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update product stock quantity for ADD adjustment', async () => {
    const product = await createTestProduct(50);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'ADD',
      quantity: 25,
      reason: null
    };

    await createStockAdjustment(input);

    // Check updated stock quantity
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(updatedProducts[0].stock_quantity).toEqual(75); // 50 + 25
  });

  it('should update product stock quantity for REDUCE adjustment', async () => {
    const product = await createTestProduct(50);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'REDUCE',
      quantity: 30,
      reason: 'Expired products'
    };

    await createStockAdjustment(input);

    // Check updated stock quantity
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(updatedProducts[0].stock_quantity).toEqual(20); // 50 - 30
  });

  it('should save stock adjustment to database', async () => {
    const product = await createTestProduct(50);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'ADD',
      quantity: 10,
      reason: 'Audit adjustment'
    };

    const result = await createStockAdjustment(input);

    // Verify adjustment record exists in database
    const adjustments = await db.select()
      .from(stockAdjustmentsTable)
      .where(eq(stockAdjustmentsTable.id, result.id))
      .execute();

    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].product_id).toEqual(product.id);
    expect(adjustments[0].adjustment_type).toEqual('ADD');
    expect(adjustments[0].quantity).toEqual(10);
    expect(adjustments[0].reason).toEqual('Audit adjustment');
    expect(adjustments[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject adjustment for non-existent product', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: 999,
      adjustment_type: 'ADD',
      quantity: 10,
      reason: null
    };

    await expect(createStockAdjustment(input))
      .rejects.toThrow(/product with id 999 not found/i);
  });

  it('should reject REDUCE adjustment with insufficient stock', async () => {
    const product = await createTestProduct(10);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'REDUCE',
      quantity: 15, // More than available stock
      reason: 'Damaged goods'
    };

    await expect(createStockAdjustment(input))
      .rejects.toThrow(/insufficient stock/i);
  });

  it('should allow REDUCE adjustment that brings stock to zero', async () => {
    const product = await createTestProduct(25);
    
    const input: CreateStockAdjustmentInput = {
      product_id: product.id,
      adjustment_type: 'REDUCE',
      quantity: 25, // Exact stock amount
      reason: 'All sold'
    };

    const result = await createStockAdjustment(input);

    expect(result.quantity).toEqual(25);

    // Check stock is now zero
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(updatedProducts[0].stock_quantity).toEqual(0);
  });
});
