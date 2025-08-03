
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable } from '../db/schema';
import { getMonthlySalesReport } from '../handlers/get_monthly_sales_report';

describe('getMonthlySalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report for month with no sales', async () => {
    const result = await getMonthlySalesReport(2024, 3);

    expect(result.date).toEqual('2024-03');
    expect(result.total_sales).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.total_transactions).toEqual(0);
  });

  it('should calculate monthly sales report correctly', async () => {
    // Create test sales for March 2024
    await db.insert(salesTable).values([
      {
        total_amount: '150.00',
        amount_paid: '200.00',
        change_amount: '50.00',
        created_at: new Date('2024-03-15T10:00:00Z')
      },
      {
        total_amount: '75.50',
        amount_paid: '80.00',
        change_amount: '4.50',
        created_at: new Date('2024-03-20T14:30:00Z')
      },
      {
        total_amount: '299.99',
        amount_paid: '300.00',
        change_amount: '0.01',
        created_at: new Date('2024-03-31T23:59:59Z')
      }
    ]).execute();

    // Create sales for different months (should not be included)
    await db.insert(salesTable).values([
      {
        total_amount: '100.00',
        amount_paid: '100.00',
        change_amount: '0.00',
        created_at: new Date('2024-02-28T12:00:00Z') // February
      },
      {
        total_amount: '200.00',
        amount_paid: '200.00',
        change_amount: '0.00',
        created_at: new Date('2024-04-01T08:00:00Z') // April
      }
    ]).execute();

    const result = await getMonthlySalesReport(2024, 3);

    expect(result.date).toEqual('2024-03');
    expect(result.total_sales).toEqual(3);
    expect(result.total_revenue).toEqual(525.49); // 150.00 + 75.50 + 299.99
    expect(result.total_transactions).toEqual(3);
  });

  it('should handle single digit months correctly', async () => {
    // Create test sale for January 2024
    await db.insert(salesTable).values({
      total_amount: '50.00',
      amount_paid: '50.00',
      change_amount: '0.00',
      created_at: new Date('2024-01-15T12:00:00Z')
    }).execute();

    const result = await getMonthlySalesReport(2024, 1);

    expect(result.date).toEqual('2024-01');
    expect(result.total_sales).toEqual(1);
    expect(result.total_revenue).toEqual(50.00);
    expect(result.total_transactions).toEqual(1);
  });

  it('should exclude sales from adjacent months', async () => {
    // Sales right at month boundaries
    await db.insert(salesTable).values([
      {
        total_amount: '100.00',
        amount_paid: '100.00',
        change_amount: '0.00',
        created_at: new Date('2024-05-31T23:59:59Z') // Last second of May
      },
      {
        total_amount: '200.00',
        amount_paid: '200.00',
        change_amount: '0.00',
        created_at: new Date('2024-06-01T00:00:00Z') // First second of June
      },
      {
        total_amount: '300.00',
        amount_paid: '300.00',
        change_amount: '0.00',
        created_at: new Date('2024-06-30T23:59:59Z') // Last second of June
      },
      {
        total_amount: '400.00',
        amount_paid: '400.00',
        change_amount: '0.00',
        created_at: new Date('2024-07-01T00:00:00Z') // First second of July
      }
    ]).execute();

    const result = await getMonthlySalesReport(2024, 6);

    expect(result.date).toEqual('2024-06');
    expect(result.total_sales).toEqual(2); // Only June sales
    expect(result.total_revenue).toEqual(500.00); // 200.00 + 300.00
    expect(result.total_transactions).toEqual(2);
  });

  it('should handle leap year February correctly', async () => {
    // Create sales for February 29, 2024 (leap year)
    await db.insert(salesTable).values({
      total_amount: '89.99',
      amount_paid: '90.00',
      change_amount: '0.01',
      created_at: new Date('2024-02-29T15:30:00Z')
    }).execute();

    const result = await getMonthlySalesReport(2024, 2);

    expect(result.date).toEqual('2024-02');
    expect(result.total_sales).toEqual(1);
    expect(result.total_revenue).toEqual(89.99);
    expect(result.total_transactions).toEqual(1);
  });
});
