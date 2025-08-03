
import { db } from '../db';
import { salesTable, saleItemsTable, productsTable } from '../db/schema';
import { type ProfitLossReport, type ReportDateRangeInput } from '../schema';
import { sql, between } from 'drizzle-orm';

export async function getDailyProfitLossReport(input: ReportDateRangeInput): Promise<ProfitLossReport[]> {
  try {
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    // Set end date to end of day to include full day
    endDate.setHours(23, 59, 59, 999);

    // Query to get daily profit/loss data
    const results = await db
      .select({
        date: sql`DATE(${salesTable.created_at})`.as('date'),
        revenue: sql`SUM(${saleItemsTable.total_price})`.as('revenue'),
        cost_of_goods_sold: sql`SUM(${saleItemsTable.quantity} * ${productsTable.purchase_price})`.as('cost_of_goods_sold'),
        total_transactions: sql`COUNT(DISTINCT ${salesTable.id})`.as('total_transactions')
      })
      .from(salesTable)
      .innerJoin(saleItemsTable, sql`${salesTable.id} = ${saleItemsTable.sale_id}`)
      .innerJoin(productsTable, sql`${saleItemsTable.product_id} = ${productsTable.id}`)
      .where(between(salesTable.created_at, startDate, endDate))
      .groupBy(sql`DATE(${salesTable.created_at})`)
      .orderBy(sql`DATE(${salesTable.created_at})`)
      .execute();

    // Convert results to ProfitLossReport format
    return results.map(result => {
      const revenue = parseFloat((result.revenue as string) || '0');
      const costOfGoodsSold = parseFloat((result.cost_of_goods_sold as string) || '0');
      const netProfit = revenue - costOfGoodsSold;

      return {
        date: result.date as string,
        revenue,
        cost_of_goods_sold: costOfGoodsSold,
        net_profit: netProfit,
        total_transactions: parseInt((result.total_transactions as string) || '0')
      };
    });
  } catch (error) {
    console.error('Daily profit/loss report generation failed:', error);
    throw error;
  }
}
