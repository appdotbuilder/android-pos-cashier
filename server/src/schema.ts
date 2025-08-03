
import { z } from 'zod';

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  barcode: z.string().nullable(),
  purchase_price: z.number(),
  selling_price: z.number(),
  stock_quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Product input schemas
export const createProductInputSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().nullable(),
  purchase_price: z.number().nonnegative(),
  selling_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  purchase_price: z.number().nonnegative().optional(),
  selling_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Sale schema
export const saleSchema = z.object({
  id: z.number(),
  total_amount: z.number(),
  amount_paid: z.number(),
  change_amount: z.number(),
  created_at: z.coerce.date()
});

export type Sale = z.infer<typeof saleSchema>;

// Sale item schema
export const saleItemSchema = z.object({
  id: z.number(),
  sale_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  product_name: z.string()
});

export type SaleItem = z.infer<typeof saleItemSchema>;

// Complete sale with items
export const saleWithItemsSchema = z.object({
  id: z.number(),
  total_amount: z.number(),
  amount_paid: z.number(),
  change_amount: z.number(),
  created_at: z.coerce.date(),
  items: z.array(saleItemSchema)
});

export type SaleWithItems = z.infer<typeof saleWithItemsSchema>;

// Sale input schemas
export const saleItemInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive()
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const createSaleInputSchema = z.object({
  items: z.array(saleItemInputSchema).min(1),
  amount_paid: z.number().positive()
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Stock adjustment schema
export const stockAdjustmentSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  adjustment_type: z.enum(['ADD', 'REDUCE']),
  quantity: z.number().int(),
  reason: z.string().nullable(),
  created_at: z.coerce.date()
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const createStockAdjustmentInputSchema = z.object({
  product_id: z.number(),
  adjustment_type: z.enum(['ADD', 'REDUCE']),
  quantity: z.number().int().positive(),
  reason: z.string().nullable()
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentInputSchema>;

// Report schemas
export const salesReportSchema = z.object({
  date: z.string(),
  total_sales: z.number(),
  total_revenue: z.number(),
  total_transactions: z.number()
});

export type SalesReport = z.infer<typeof salesReportSchema>;

export const profitLossReportSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  cost_of_goods_sold: z.number(),
  net_profit: z.number(),
  total_transactions: z.number()
});

export type ProfitLossReport = z.infer<typeof profitLossReportSchema>;

export const stockReportSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  current_stock: z.number(),
  purchase_price: z.number(),
  selling_price: z.number(),
  stock_value: z.number()
});

export type StockReport = z.infer<typeof stockReportSchema>;

// Search and filter schemas
export const productSearchInputSchema = z.object({
  query: z.string().optional(),
  barcode: z.string().optional()
});

export type ProductSearchInput = z.infer<typeof productSearchInputSchema>;

export const reportDateRangeInputSchema = z.object({
  start_date: z.string(),
  end_date: z.string()
});

export type ReportDateRangeInput = z.infer<typeof reportDateRangeInputSchema>;
