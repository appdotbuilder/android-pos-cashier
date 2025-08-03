
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTable, saleItemsTable } from '../db/schema';
import { getSaleById } from '../handlers/get_sale_by_id';

describe('getSaleById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get a sale with its items', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: '123456789',
        purchase_price: '10.00',
        selling_price: '15.99',
        stock_quantity: 100
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create test sale
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '31.98',
        amount_paid: '35.00',
        change_amount: '3.02'
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    // Create test sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale.id,
          product_id: product.id,
          quantity: 2,
          unit_price: '15.99',
          total_price: '31.98',
          product_name: 'Test Product'
        }
      ])
      .execute();

    const result = await getSaleById(sale.id);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(sale.id);
    expect(result?.total_amount).toEqual(31.98);
    expect(result?.amount_paid).toEqual(35.00);
    expect(result?.change_amount).toEqual(3.02);
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.items).toHaveLength(1);

    const item = result?.items[0];
    expect(item?.id).toBeDefined();
    expect(item?.sale_id).toEqual(sale.id);
    expect(item?.product_id).toEqual(product.id);
    expect(item?.quantity).toEqual(2);
    expect(item?.unit_price).toEqual(15.99);
    expect(item?.total_price).toEqual(31.98);
    expect(item?.product_name).toEqual('Test Product');
  });

  it('should get a sale with multiple items', async () => {
    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        barcode: '111111111',
        purchase_price: '5.00',
        selling_price: '9.99',
        stock_quantity: 50
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        barcode: '222222222',
        purchase_price: '8.00',
        selling_price: '12.50',
        stock_quantity: 30
      })
      .returning()
      .execute();

    const product1 = product1Result[0];
    const product2 = product2Result[0];

    // Create test sale
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '34.98',
        amount_paid: '40.00',
        change_amount: '5.02'
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    // Create multiple sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale.id,
          product_id: product1.id,
          quantity: 1,
          unit_price: '9.99',
          total_price: '9.99',
          product_name: 'Product 1'
        },
        {
          sale_id: sale.id,
          product_id: product2.id,
          quantity: 2,
          unit_price: '12.50',
          total_price: '25.00',
          product_name: 'Product 2'
        }
      ])
      .execute();

    const result = await getSaleById(sale.id);

    expect(result).toBeDefined();
    expect(result?.items).toHaveLength(2);

    // Check items are properly sorted/organized
    const items = result?.items || [];
    expect(items.some(item => item.product_name === 'Product 1' && item.quantity === 1)).toBe(true);
    expect(items.some(item => item.product_name === 'Product 2' && item.quantity === 2)).toBe(true);
  });

  it('should return null for non-existent sale', async () => {
    const result = await getSaleById(999);

    expect(result).toBeNull();
  });

  it('should return sale with empty items array when no items exist', async () => {
    // Create test sale without items
    const saleResult = await db.insert(salesTable)
      .values({
        total_amount: '0.00',
        amount_paid: '0.00',
        change_amount: '0.00'
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    const result = await getSaleById(sale.id);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(sale.id);
    expect(result?.items).toHaveLength(0);
    expect(result?.total_amount).toEqual(0);
  });
});
