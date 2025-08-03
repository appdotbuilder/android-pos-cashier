
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductSearchInput, type CreateProductInput } from '../schema';
import { searchProducts } from '../handlers/search_products';

// Test products data
const testProducts: CreateProductInput[] = [
  {
    name: 'Coca Cola 500ml',
    barcode: '1234567890123',
    purchase_price: 1.50,
    selling_price: 2.00,
    stock_quantity: 50
  },
  {
    name: 'Pepsi Cola 500ml',
    barcode: '9876543210987',
    purchase_price: 1.45,
    selling_price: 1.95,
    stock_quantity: 30
  },
  {
    name: 'Apple Juice 1L',
    barcode: '5555666677778',
    purchase_price: 2.00,
    selling_price: 3.50,
    stock_quantity: 25
  },
  {
    name: 'Orange Juice 1L',
    barcode: null,
    purchase_price: 2.10,
    selling_price: 3.60,
    stock_quantity: 20
  }
];

describe('searchProducts', () => {
  beforeEach(async () => {
    await createDB();
    
    // Insert test products
    await db.insert(productsTable)
      .values(testProducts.map(product => ({
        ...product,
        purchase_price: product.purchase_price.toString(),
        selling_price: product.selling_price.toString()
      })))
      .execute();
  });

  afterEach(resetDB);

  it('should return all products when no search criteria provided', async () => {
    const result = await searchProducts({});

    expect(result).toHaveLength(4);
    result.forEach(product => {
      expect(typeof product.purchase_price).toBe('number');
      expect(typeof product.selling_price).toBe('number');
      expect(product.id).toBeDefined();
      expect(product.created_at).toBeInstanceOf(Date);
    });
  });

  it('should search products by partial name match', async () => {
    const result = await searchProducts({ query: 'Cola' });

    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(
      expect.arrayContaining(['Coca Cola 500ml', 'Pepsi Cola 500ml'])
    );
  });

  it('should search products by case-insensitive partial name match', async () => {
    const result = await searchProducts({ query: 'juice' });

    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(
      expect.arrayContaining(['Apple Juice 1L', 'Orange Juice 1L'])
    );
  });

  it('should search products by exact barcode match', async () => {
    const result = await searchProducts({ barcode: '1234567890123' });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Coca Cola 500ml');
    expect(result[0].barcode).toBe('1234567890123');
  });

  it('should return empty array for non-existent barcode', async () => {
    const result = await searchProducts({ barcode: '0000000000000' });

    expect(result).toHaveLength(0);
  });

  it('should search by both name and barcode with OR logic', async () => {
    const result = await searchProducts({ 
      query: 'Apple',
      barcode: '1234567890123'
    });

    expect(result).toHaveLength(2);
    const names = result.map(p => p.name);
    expect(names).toEqual(
      expect.arrayContaining(['Apple Juice 1L', 'Coca Cola 500ml'])
    );
  });

  it('should handle empty string query gracefully', async () => {
    const result = await searchProducts({ query: '' });

    expect(result).toHaveLength(4);
  });

  it('should handle whitespace-only query gracefully', async () => {
    const result = await searchProducts({ query: '   ' });

    expect(result).toHaveLength(4);
  });

  it('should trim barcode input', async () => {
    const result = await searchProducts({ barcode: '  1234567890123  ' });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Coca Cola 500ml');
  });

  it('should return empty array when no matches found', async () => {
    const result = await searchProducts({ query: 'NonExistentProduct' });

    expect(result).toHaveLength(0);
  });

  it('should convert numeric fields correctly', async () => {
    const result = await searchProducts({ query: 'Coca' });

    expect(result).toHaveLength(1);
    const product = result[0];
    expect(product.purchase_price).toBe(1.50);
    expect(product.selling_price).toBe(2.00);
    expect(typeof product.purchase_price).toBe('number');
    expect(typeof product.selling_price).toBe('number');
  });
});
