
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const adjustmentTypeEnum = pgEnum('adjustment_type', ['ADD', 'REDUCE']);

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  barcode: text('barcode'),
  purchase_price: numeric('purchase_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales table
export const salesTable = pgTable('sales', {
  id: serial('id').primaryKey(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull(),
  change_amount: numeric('change_amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Sale items table
export const saleItemsTable = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  sale_id: integer('sale_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  product_name: text('product_name').notNull() // Denormalized for receipt generation
});

// Stock adjustments table
export const stockAdjustmentsTable = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  adjustment_type: adjustmentTypeEnum('adjustment_type').notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  saleItems: many(saleItemsTable),
  stockAdjustments: many(stockAdjustmentsTable),
}));

export const salesRelations = relations(salesTable, ({ many }) => ({
  items: many(saleItemsTable),
}));

export const saleItemsRelations = relations(saleItemsTable, ({ one }) => ({
  sale: one(salesTable, {
    fields: [saleItemsTable.sale_id],
    references: [salesTable.id],
  }),
  product: one(productsTable, {
    fields: [saleItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustmentsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [stockAdjustmentsTable.product_id],
    references: [productsTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  products: productsTable,
  sales: salesTable,
  saleItems: saleItemsTable,
  stockAdjustments: stockAdjustmentsTable
};
