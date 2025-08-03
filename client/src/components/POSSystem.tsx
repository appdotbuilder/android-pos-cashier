
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, Calculator } from 'lucide-react';
import type { Product, CreateSaleInput, SaleWithItems } from '../../../server/src/schema';

interface CartItem extends Product {
  cartQuantity: number;
  cartTotal: number;
}

export function POSSystem() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [lastSale, setLastSale] = useState<SaleWithItems | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Load products on mount
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
      setSearchResults(result.slice(0, 10)); // Show first 10 products initially
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Search products
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(products.slice(0, 10));
      return;
    }

    try {
      const results = await trpc.searchProducts.query({ query });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to local search
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.barcode && p.barcode.includes(query))
      );
      setSearchResults(filtered);
    }
  }, [products]);

  // Add item to cart
  const addToCart = useCallback((product: Product) => {
    setCart((prevCart: CartItem[]) => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        if (existingItem.cartQuantity >= product.stock_quantity) {
          alert(`Cannot add more. Only ${product.stock_quantity} items available.`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? {
                ...item,
                cartQuantity: item.cartQuantity + 1,
                cartTotal: (item.cartQuantity + 1) * item.selling_price
              }
            : item
        );
      } else {
        if (product.stock_quantity <= 0) {
          alert('Product is out of stock.');
          return prevCart;
        }
        return [...prevCart, {
          ...product,
          cartQuantity: 1,
          cartTotal: product.selling_price
        }];
      }
    });
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((productId: number) => {
    setCart((prevCart: CartItem[]) => prevCart.filter(item => item.id !== productId));
  }, []);

  // Update cart item quantity
  const updateCartQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart: CartItem[]) =>
      prevCart.map(item => {
        if (item.id === productId) {
          if (newQuantity > item.stock_quantity) {
            alert(`Cannot add more. Only ${item.stock_quantity} items available.`);
            return item;
          }
          return {
            ...item,
            cartQuantity: newQuantity,
            cartTotal: newQuantity * item.selling_price
          };
        }
        return item;
      })
    );
  }, [removeFromCart]);

  // Calculate totals
  const cartTotal = cart.reduce((sum, item) => sum + item.cartTotal, 0);
  const changeAmount = Math.max(0, amountPaid - cartTotal);

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add items to proceed.');
      return;
    }

    if (amountPaid < cartTotal) {
      alert('Insufficient payment amount.');
      return;
    }

    setIsProcessingSale(true);
    try {
      const saleInput: CreateSaleInput = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.cartQuantity
        })),
        amount_paid: amountPaid
      };

      const sale = await trpc.createSale.mutate(saleInput);
      setLastSale(sale);
      setShowReceipt(true);
      
      // Clear cart and reset form
      setCart([]);
      setAmountPaid(0);
      
      // Refresh products to update stock
      loadProducts();
      
    } catch (error) {
      console.error('Sale processing failed:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Print receipt
  const printReceipt = () => {
    if (!lastSale) return;
    
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${lastSale.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>POS SYSTEM</h2>
            <p>Receipt #${lastSale.id}</p>
            <p>${lastSale.created_at.toLocaleDateString()} ${lastSale.created_at.toLocaleTimeString()}</p>
          </div>
          
          ${lastSale.items.map(item => `
            <div class="item">
              <span>${item.product_name}</span>
              <span></span>
            </div>
            <div class="item">
              <span>${item.quantity} x $${item.unit_price.toFixed(2)}</span>
              <span>$${item.total_price.toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="total">
            <div class="item">
              <span>TOTAL:</span>
              <span>$${lastSale.total_amount.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>PAID:</span>
              <span>$${lastSale.amount_paid.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>CHANGE:</span>
              <span>$${lastSale.change_amount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="center" style="margin-top: 20px;">
            <p>Thank you for your purchase!</p>
          </div>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  return (
    <div className="p-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Product Search & Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Product Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or scan barcode..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                  className="pl-10 text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] lg:h-[500px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.map((product: Product) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                        product.stock_quantity <= 0 ? 'opacity-50' : ''
                      }`}
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-sm">{product.name}</h3>
                          <Badge variant={product.stock_quantity > 0 ? 'default' : 'destructive'}>
                            Stock: {product.stock_quantity}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-600">
                            ${product.selling_price.toFixed(2)}
                          </span>
                          {product.barcode && (
                            <span className="text-xs text-gray-500">
                              {product.barcode}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart</span>
                </div>
                <Badge variant="secondary">{cart.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] mb-4">
                {cart.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item: CartItem) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.cartQuantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              ${item.selling_price.toFixed(2)} each
                            </div>
                            <div className="font-semibold">
                              ${item.cartTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator className="my-4" />

              {/* Total and Payment */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Paid</label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amountPaid || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setAmountPaid(parseFloat(e.target.value) || 0)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                {amountPaid > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Change:</span>
                    <span className="font-semibold text-green-600">
                      ${changeAmount.toFixed(2)}
                    </span>
                  </div>
                )}

                <Button
                  onClick={processSale}
                  disabled={cart.length === 0 || amountPaid < cartTotal || isProcessingSale}
                  className="w-full"
                  size="lg"
                >
                  {isProcessingSale ? 'Processing...' : 'Complete Sale'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Dialog */}
      <AlertDialog open={showReceipt} onOpenChange={setShowReceipt}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Sale Completed</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Transaction completed successfully!</p>
                {lastSale && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Receipt #:</span>
                      <span className="font-medium">{lastSale.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">${lastSale.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span className="font-medium">${lastSale.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change:</span>
                      <span className="font-medium text-green-600">${lastSale.change_amount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex space-x-2">
            <Button variant="outline" onClick={printReceipt}>
              Print Receipt
            </Button>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
