
import { db } from '../db';
import { salesTable, saleItemsTable, productsTable } from '../db/schema';
import { type ProfitLossReport } from '../schema';
import { eq, and, gte, lt, sum, count, sql } from 'drizzle-orm';

export async function getMonthlyProfitLossReport(year: number, month: number): Promise<ProfitLossReport> {
  try {
    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1); // month is 1-based, Date constructor is 0-based
    const endDate = new Date(year, month, 1); // First day of next month
    
    // Query to get revenue and transaction count for the month
    const revenueResult = await db
      .select({
        total_revenue: sum(salesTable.total_amount),
        total_transactions: count(salesTable.id)
      })
      .from(salesTable)
      .where(
        and(
          gte(salesTable.created_at, startDate),
          lt(salesTable.created_at, endDate)
        )
      )
      .execute();

    // Query to get cost of goods sold for the month
    const cogsResult = await db
      .select({
        total_cogs: sql<string>`sum(${saleItemsTable.quantity} * ${productsTable.purchase_price})`
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(
        and(
          gte(salesTable.created_at, startDate),
          lt(salesTable.created_at, endDate)
        )
      )
      .execute();

    // Extract values and handle null cases
    const revenue = revenueResult[0]?.total_revenue ? parseFloat(revenueResult[0].total_revenue) : 0;
    const totalTransactions = revenueResult[0]?.total_transactions || 0;
    const costOfGoodsSold = cogsResult[0]?.total_cogs ? parseFloat(cogsResult[0].total_cogs) : 0;
    const netProfit = revenue - costOfGoodsSold;

    return {
      date: `${year}-${month.toString().padStart(2, '0')}`,
      revenue,
      cost_of_goods_sold: costOfGoodsSold,
      net_profit: netProfit,
      total_transactions: totalTransactions
    };
  } catch (error) {
    console.error('Monthly profit/loss report generation failed:', error);
    throw error;
  }
}
