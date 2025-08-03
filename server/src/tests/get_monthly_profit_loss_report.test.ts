
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTable, saleItemsTable } from '../db/schema';
import { getMonthlyProfitLossReport } from '../handlers/get_monthly_profit_loss_report';

describe('getMonthlyProfitLossReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero values for month with no sales', async () => {
    const result = await getMonthlyProfitLossReport(2024, 3);

    expect(result.date).toEqual('2024-03');
    expect(result.revenue).toEqual(0);
    expect(result.cost_of_goods_sold).toEqual(0);
    expect(result.net_profit).toEqual(0);
    expect(result.total_transactions).toEqual(0);
  });

  it('should calculate profit/loss report for month with sales', async () => {
    // Create test product
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
    
    const product = productResult[0];

    // Create test sale in March 2024
    const saleDate = new Date('2024-03-15T10:00:00Z');
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '30.00', // 2 items * 15.00 each
        amount_paid: '30.00',
        change_amount: '0.00',
        created_at: saleDate
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    // Create sale item
    await db.insert(saleItemsTable)
      .values({
        sale_id: sale.id,
        product_id: product.id,
        quantity: 2,
        unit_price: '15.00',
        total_price: '30.00',
        product_name: 'Test Product'
      })
      .execute();

    const result = await getMonthlyProfitLossReport(2024, 3);

    expect(result.date).toEqual('2024-03');
    expect(result.revenue).toEqual(30.00);
    expect(result.cost_of_goods_sold).toEqual(20.00); // 2 * 10.00
    expect(result.net_profit).toEqual(10.00); // 30.00 - 20.00
    expect(result.total_transactions).toEqual(1);
  });

  it('should only include sales from specified month', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: '123456789',
        purchase_price: '5.00',
        selling_price: '10.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    
    const product = productResult[0];

    // Create sale in March 2024
    const marchSaleResult = await db.insert(salesTable)
      .values({
        total_amount: '20.00',
        amount_paid: '20.00',
        change_amount: '0.00',
        created_at: new Date('2024-03-15T10:00:00Z')
      })
      .returning()
      .execute();

    // Create sale in April 2024 (should not be included)
    const aprilSaleResult = await db.insert(salesTable)
      .values({
        total_amount: '30.00',
        amount_paid: '30.00',
        change_amount: '0.00',
        created_at: new Date('2024-04-15T10:00:00Z')
      })
      .returning()
      .execute();

    // Add sale items for March
    await db.insert(saleItemsTable)
      .values({
        sale_id: marchSaleResult[0].id,
        product_id: product.id,
        quantity: 2,
        unit_price: '10.00',
        total_price: '20.00',
        product_name: 'Test Product'
      })
      .execute();

    // Add sale items for April
    await db.insert(saleItemsTable)
      .values({
        sale_id: aprilSaleResult[0].id,
        product_id: product.id,
        quantity: 3,
        unit_price: '10.00',
        total_price: '30.00',
        product_name: 'Test Product'
      })
      .execute();

    const marchResult = await getMonthlyProfitLossReport(2024, 3);

    expect(marchResult.date).toEqual('2024-03');
    expect(marchResult.revenue).toEqual(20.00);
    expect(marchResult.cost_of_goods_sold).toEqual(10.00); // 2 * 5.00
    expect(marchResult.net_profit).toEqual(10.00);
    expect(marchResult.total_transactions).toEqual(1);
  });

  it('should handle multiple sales in same month', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: '123456789',
        purchase_price: '8.00',
        selling_price: '12.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    
    const product = productResult[0];

    // Create first sale
    const sale1Result = await db.insert(salesTable)
      .values({
        total_amount: '24.00',
        amount_paid: '24.00',
        change_amount: '0.00',
        created_at: new Date('2024-03-10T10:00:00Z')
      })
      .returning()
      .execute();

    // Create second sale
    const sale2Result = await db.insert(salesTable)
      .values({
        total_amount: '36.00',
        amount_paid: '40.00',
        change_amount: '4.00',
        created_at: new Date('2024-03-20T14:00:00Z')
      })
      .returning()
      .execute();

    // Add sale items for first sale
    await db.insert(saleItemsTable)
      .values({
        sale_id: sale1Result[0].id,
        product_id: product.id,
        quantity: 2,
        unit_price: '12.00',
        total_price: '24.00',
        product_name: 'Test Product'
      })
      .execute();

    // Add sale items for second sale
    await db.insert(saleItemsTable)
      .values({
        sale_id: sale2Result[0].id,
        product_id: product.id,
        quantity: 3,
        unit_price: '12.00',
        total_price: '36.00',
        product_name: 'Test Product'
      })
      .execute();

    const result = await getMonthlyProfitLossReport(2024, 3);

    expect(result.date).toEqual('2024-03');
    expect(result.revenue).toEqual(60.00); // 24.00 + 36.00
    expect(result.cost_of_goods_sold).toEqual(40.00); // (2 + 3) * 8.00
    expect(result.net_profit).toEqual(20.00); // 60.00 - 40.00
    expect(result.total_transactions).toEqual(2);
  });

  it('should handle edge case at month boundaries', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: '123456789',
        purchase_price: '5.00',
        selling_price: '10.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    
    const product = productResult[0];

    // Sale on last day of February (should not be included in March report)
    const febSaleResult = await db.insert(salesTable)
      .values({
        total_amount: '10.00',
        amount_paid: '10.00',
        change_amount: '0.00',
        created_at: new Date('2024-02-29T23:59:59Z')
      })
      .returning()
      .execute();

    // Sale on first day of March (should be included)
    const marchSaleResult = await db.insert(salesTable)
      .values({
        total_amount: '20.00',
        amount_paid: '20.00',
        change_amount: '0.00',
        created_at: new Date('2024-03-01T00:00:00Z')
      })
      .returning()
      .execute();

    // Sale on first day of April (should not be included)
    const aprilSaleResult = await db.insert(salesTable)
      .values({
        total_amount: '30.00',
        amount_paid: '30.00',
        change_amount: '0.00',
        created_at: new Date('2024-04-01T00:00:00Z')
      })
      .returning()
      .execute();

    // Add sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: febSaleResult[0].id,
          product_id: product.id,
          quantity: 1,
          unit_price: '10.00',
          total_price: '10.00',
          product_name: 'Test Product'
        },
        {
          sale_id: marchSaleResult[0].id,
          product_id: product.id,
          quantity: 2,
          unit_price: '10.00',
          total_price: '20.00',
          product_name: 'Test Product'
        },
        {
          sale_id: aprilSaleResult[0].id,
          product_id: product.id,
          quantity: 3,
          unit_price: '10.00',
          total_price: '30.00',
          product_name: 'Test Product'
        }
      ])
      .execute();

    const result = await getMonthlyProfitLossReport(2024, 3);

    expect(result.date).toEqual('2024-03');
    expect(result.revenue).toEqual(20.00); // Only March sale
    expect(result.cost_of_goods_sold).toEqual(10.00); // 2 * 5.00
    expect(result.net_profit).toEqual(10.00);
    expect(result.total_transactions).toEqual(1);
  });
});
