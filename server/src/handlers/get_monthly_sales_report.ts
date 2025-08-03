
import { db } from '../db';
import { salesTable } from '../db/schema';
import { type SalesReport } from '../schema';
import { sql, gte, lt, count, sum } from 'drizzle-orm';

export async function getMonthlySalesReport(year: number, month: number): Promise<SalesReport> {
  try {
    // Create date range for the specified month
    const startDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
    const endDate = new Date(year, month, 1); // Start of next month

    // Query sales data for the month
    const result = await db.select({
      total_transactions: count(salesTable.id),
      total_revenue: sum(salesTable.total_amount),
      total_sales: count(salesTable.id) // Same as total_transactions for this report
    })
    .from(salesTable)
    .where(
      sql`${salesTable.created_at} >= ${startDate} AND ${salesTable.created_at} < ${endDate}`
    )
    .execute();

    const data = result[0];
    
    // Format the date string as YYYY-MM
    const dateString = `${year}-${month.toString().padStart(2, '0')}`;

    return {
      date: dateString,
      total_sales: Number(data.total_sales) || 0,
      total_revenue: parseFloat(data.total_revenue as string) || 0,
      total_transactions: Number(data.total_transactions) || 0
    };
  } catch (error) {
    console.error('Monthly sales report generation failed:', error);
    throw error;
  }
}
