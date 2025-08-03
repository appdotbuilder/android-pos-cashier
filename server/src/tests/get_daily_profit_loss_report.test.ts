
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTable, saleItemsTable } from '../db/schema';
import { type ReportDateRangeInput, type CreateProductInput } from '../schema';
import { getDailyProfitLossReport } from '../handlers/get_daily_profit_loss_report';

// Test data
const testProduct1: CreateProductInput = {
  name: 'Test Product 1',
  barcode: '123456789',
  purchase_price: 5.00,
  selling_price: 10.00,
  stock_quantity: 100
};

const testProduct2: CreateProductInput = {
  name: 'Test Product 2',
  barcode: '987654321',
  purchase_price: 3.00,
  selling_price: 8.00,
  stock_quantity: 50
};

describe('getDailyProfitLossReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const input: ReportDateRangeInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getDailyProfitLossReport(input);
    expect(result).toEqual([]);
  });

  it('should calculate daily profit/loss report correctly', async () => {
    // Create test products
    const product1 = await db.insert(productsTable)
      .values({
        name: testProduct1.name,
        barcode: testProduct1.barcode,
        purchase_price: testProduct1.purchase_price.toString(),
        selling_price: testProduct1.selling_price.toString(),
        stock_quantity: testProduct1.stock_quantity
      })
      .returning()
      .execute();

    const product2 = await db.insert(productsTable)
      .values({
        name: testProduct2.name,
        barcode: testProduct2.barcode,
        purchase_price: testProduct2.purchase_price.toString(),
        selling_price: testProduct2.selling_price.toString(),
        stock_quantity: testProduct2.stock_quantity
      })
      .returning()
      .execute();

    // Create test sale for today
    const today = new Date();
    const sale = await db.insert(salesTable)
      .values({
        total_amount: '26.00',
        amount_paid: '30.00',
        change_amount: '4.00',
        created_at: today
      })
      .returning()
      .execute();

    // Create sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale[0].id,
          product_id: product1[0].id,
          quantity: 2,
          unit_price: '10.00',
          total_price: '20.00',
          product_name: testProduct1.name
        },
        {
          sale_id: sale[0].id,
          product_id: product2[0].id,
          quantity: 1,
          unit_price: '8.00',
          total_price: '8.00',
          product_name: testProduct2.name
        }
      ])
      .execute();

    // Test report generation
    const todayStr = today.toISOString().split('T')[0];
    const input: ReportDateRangeInput = {
      start_date: todayStr,
      end_date: todayStr
    };

    const result = await getDailyProfitLossReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual(todayStr);
    expect(result[0].revenue).toEqual(28.00); // 20.00 + 8.00
    expect(result[0].cost_of_goods_sold).toEqual(13.00); // (2 * 5.00) + (1 * 3.00)
    expect(result[0].net_profit).toEqual(15.00); // 28.00 - 13.00
    expect(result[0].total_transactions).toEqual(1);
  });

  it('should handle multiple days with different sales', async () => {
    // Create test product
    const product = await db.insert(productsTable)
      .values({
        name: testProduct1.name,
        barcode: testProduct1.barcode,
        purchase_price: testProduct1.purchase_price.toString(),
        selling_price: testProduct1.selling_price.toString(),
        stock_quantity: testProduct1.stock_quantity
      })
      .returning()
      .execute();

    // Create sales for different days
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const today = new Date();

    // Sale for yesterday
    const sale1 = await db.insert(salesTable)
      .values({
        total_amount: '10.00',
        amount_paid: '10.00',
        change_amount: '0.00',
        created_at: yesterday
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: sale1[0].id,
        product_id: product[0].id,
        quantity: 1,
        unit_price: '10.00',
        total_price: '10.00',
        product_name: testProduct1.name
      })
      .execute();

    // Sale for today
    const sale2 = await db.insert(salesTable)
      .values({
        total_amount: '20.00',
        amount_paid: '20.00',
        change_amount: '0.00',
        created_at: today
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: sale2[0].id,
        product_id: product[0].id,
        quantity: 2,
        unit_price: '10.00',
        total_price: '20.00',
        product_name: testProduct1.name
      })
      .execute();

    // Test report for date range
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    const input: ReportDateRangeInput = {
      start_date: yesterdayStr,
      end_date: todayStr
    };

    const result = await getDailyProfitLossReport(input);

    expect(result).toHaveLength(2);
    
    // Check yesterday's data
    const yesterdayReport = result.find(r => r.date === yesterdayStr);
    expect(yesterdayReport).toBeDefined();
    expect(yesterdayReport!.revenue).toEqual(10.00);
    expect(yesterdayReport!.cost_of_goods_sold).toEqual(5.00);
    expect(yesterdayReport!.net_profit).toEqual(5.00);
    expect(yesterdayReport!.total_transactions).toEqual(1);

    // Check today's data
    const todayReport = result.find(r => r.date === todayStr);
    expect(todayReport).toBeDefined();
    expect(todayReport!.revenue).toEqual(20.00);
    expect(todayReport!.cost_of_goods_sold).toEqual(10.00);
    expect(todayReport!.net_profit).toEqual(10.00);
    expect(todayReport!.total_transactions).toEqual(1);
  });

  it('should return empty array for date range with no sales', async () => {
    // Create product and sale for today
    const product = await db.insert(productsTable)
      .values({
        name: testProduct1.name,
        barcode: testProduct1.barcode,
        purchase_price: testProduct1.purchase_price.toString(),
        selling_price: testProduct1.selling_price.toString(),
        stock_quantity: testProduct1.stock_quantity
      })
      .returning()
      .execute();

    const sale = await db.insert(salesTable)
      .values({
        total_amount: '10.00',
        amount_paid: '10.00',
        change_amount: '0.00',
        created_at: new Date()
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: sale[0].id,
        product_id: product[0].id,
        quantity: 1,
        unit_price: '10.00',
        total_price: '10.00',
        product_name: testProduct1.name
      })
      .execute();

    // Query for future date range
    const input: ReportDateRangeInput = {
      start_date: '2025-01-01',
      end_date: '2025-01-31'
    };

    const result = await getDailyProfitLossReport(input);
    expect(result).toEqual([]);
  });
});
