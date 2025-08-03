
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable } from '../db/schema';
import { type ReportDateRangeInput } from '../schema';
import { getDailySalesReport } from '../handlers/get_daily_sales_report';

describe('getDailySalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const input: ReportDateRangeInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getDailySalesReport(input);

    expect(result).toEqual([]);
  });

  it('should aggregate sales data by date', async () => {
    // Create test sales data
    const today = new Date('2024-01-15T10:00:00Z');
    const tomorrow = new Date('2024-01-16T14:30:00Z');

    await db.insert(salesTable).values([
      {
        total_amount: '150.00',
        amount_paid: '150.00',
        change_amount: '0.00',
        created_at: today
      },
      {
        total_amount: '250.50',
        amount_paid: '300.00',
        change_amount: '49.50',
        created_at: today
      },
      {
        total_amount: '75.25',
        amount_paid: '80.00',
        change_amount: '4.75',
        created_at: tomorrow
      }
    ]).execute();

    const input: ReportDateRangeInput = {
      start_date: '2024-01-15',
      end_date: '2024-01-16'
    };

    const result = await getDailySalesReport(input);

    expect(result).toHaveLength(2);
    
    // Results should be ordered by date descending
    expect(result[0].date).toEqual('2024-01-16');
    expect(result[0].total_sales).toEqual(75.25);
    expect(result[0].total_revenue).toEqual(75.25);
    expect(result[0].total_transactions).toEqual(1);

    expect(result[1].date).toEqual('2024-01-15');
    expect(result[1].total_sales).toEqual(400.5); // 150.00 + 250.50
    expect(result[1].total_revenue).toEqual(400.5);
    expect(result[1].total_transactions).toEqual(2);
  });

  it('should filter sales by date range correctly', async () => {
    // Create sales outside the date range
    const beforeRange = new Date('2024-01-10T10:00:00Z');
    const inRange = new Date('2024-01-15T10:00:00Z');
    const afterRange = new Date('2024-01-20T10:00:00Z');

    await db.insert(salesTable).values([
      {
        total_amount: '100.00',
        amount_paid: '100.00',
        change_amount: '0.00',
        created_at: beforeRange
      },
      {
        total_amount: '200.00',
        amount_paid: '200.00',
        change_amount: '0.00',
        created_at: inRange
      },
      {
        total_amount: '300.00',
        amount_paid: '300.00',
        change_amount: '0.00',
        created_at: afterRange
      }
    ]).execute();

    const input: ReportDateRangeInput = {
      start_date: '2024-01-14',
      end_date: '2024-01-16'
    };

    const result = await getDailySalesReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual('2024-01-15');
    expect(result[0].total_sales).toEqual(200.00);
    expect(result[0].total_transactions).toEqual(1);
  });

  it('should handle single day date range', async () => {
    const saleDate = new Date('2024-01-15T10:00:00Z');

    await db.insert(salesTable).values({
      total_amount: '99.99',
      amount_paid: '100.00',
      change_amount: '0.01',
      created_at: saleDate
    }).execute();

    const input: ReportDateRangeInput = {
      start_date: '2024-01-15',
      end_date: '2024-01-15'
    };

    const result = await getDailySalesReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual('2024-01-15');
    expect(result[0].total_sales).toEqual(99.99);
    expect(result[0].total_revenue).toEqual(99.99);
    expect(result[0].total_transactions).toEqual(1);
  });

  it('should return results in descending date order', async () => {
    const dates = [
      new Date('2024-01-13T10:00:00Z'),
      new Date('2024-01-15T10:00:00Z'),
      new Date('2024-01-14T10:00:00Z')
    ];

    for (const date of dates) {
      await db.insert(salesTable).values({
        total_amount: '50.00',
        amount_paid: '50.00',
        change_amount: '0.00',
        created_at: date
      }).execute();
    }

    const input: ReportDateRangeInput = {
      start_date: '2024-01-13',
      end_date: '2024-01-15'
    };

    const result = await getDailySalesReport(input);

    expect(result).toHaveLength(3);
    expect(result[0].date).toEqual('2024-01-15');
    expect(result[1].date).toEqual('2024-01-14');
    expect(result[2].date).toEqual('2024-01-13');
  });
});
