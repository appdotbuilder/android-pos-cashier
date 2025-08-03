
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createProductInputSchema,
  updateProductInputSchema,
  createSaleInputSchema,
  createStockAdjustmentInputSchema,
  productSearchInputSchema,
  reportDateRangeInputSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { updateProduct } from './handlers/update_product';
import { getProducts } from './handlers/get_products';
import { getProductById } from './handlers/get_product_by_id';
import { searchProducts } from './handlers/search_products';
import { createSale } from './handlers/create_sale';
import { getSales } from './handlers/get_sales';
import { getSaleById } from './handlers/get_sale_by_id';
import { createStockAdjustment } from './handlers/create_stock_adjustment';
import { getStockAdjustments } from './handlers/get_stock_adjustments';
import { getDailySalesReport } from './handlers/get_daily_sales_report';
import { getMonthlySalesReport } from './handlers/get_monthly_sales_report';
import { getDailyProfitLossReport } from './handlers/get_daily_profit_loss_report';
import { getMonthlyProfitLossReport } from './handlers/get_monthly_profit_loss_report';
import { getStockReport } from './handlers/get_stock_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  getProductById: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductById(input)),
  
  searchProducts: publicProcedure
    .input(productSearchInputSchema)
    .query(({ input }) => searchProducts(input)),

  // Sales/POS system
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input)),
  
  getSales: publicProcedure
    .query(() => getSales()),
  
  getSaleById: publicProcedure
    .input(z.number())
    .query(({ input }) => getSaleById(input)),

  // Stock management
  createStockAdjustment: publicProcedure
    .input(createStockAdjustmentInputSchema)
    .mutation(({ input }) => createStockAdjustment(input)),
  
  getStockAdjustments: publicProcedure
    .query(() => getStockAdjustments()),

  // Reports
  getDailySalesReport: publicProcedure
    .input(reportDateRangeInputSchema)
    .query(({ input }) => getDailySalesReport(input)),
  
  getMonthlySalesReport: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(({ input }) => getMonthlySalesReport(input.year, input.month)),
  
  getDailyProfitLossReport: publicProcedure
    .input(reportDateRangeInputSchema)
    .query(({ input }) => getDailyProfitLossReport(input)),
  
  getMonthlyProfitLossReport: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(({ input }) => getMonthlyProfitLossReport(input.year, input.month)),
  
  getStockReport: publicProcedure
    .query(() => getStockReport()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`POS TRPC server listening at port: ${port}`);
}

start();
