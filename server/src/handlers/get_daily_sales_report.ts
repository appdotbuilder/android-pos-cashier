
import { db } from '../db';
import { salesTable } from '../db/schema';
import { type SalesReport, type ReportDateRangeInput } from '../schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';

export async function getDailySalesReport(input: ReportDateRangeInput): Promise<SalesReport[]> {
  try {
    // Parse the input date strings to Date objects
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    // Set end date to end of day to include all sales on that date
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query to aggregate sales data by date
    const results = await db
      .select({
        date: sql<string>`DATE(${salesTable.created_at})`.as('date'),
        total_sales: sql<string>`COALESCE(SUM(${salesTable.total_amount}), 0)`.as('total_sales'),
        total_revenue: sql<string>`COALESCE(SUM(${salesTable.total_amount}), 0)`.as('total_revenue'),
        total_transactions: sql<string>`COUNT(*)`.as('total_transactions')
      })
      .from(salesTable)
      .where(
        and(
          gte(salesTable.created_at, startDate),
          lte(salesTable.created_at, endOfDay)
        )
      )
      .groupBy(sql`DATE(${salesTable.created_at})`)
      .orderBy(desc(sql`DATE(${salesTable.created_at})`))
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(result => ({
      date: result.date,
      total_sales: parseFloat(result.total_sales),
      total_revenue: parseFloat(result.total_revenue),
      total_transactions: parseInt(result.total_transactions)
    }));
  } catch (error) {
    console.error('Daily sales report generation failed:', error);
    throw error;
  }
}
