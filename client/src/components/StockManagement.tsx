
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import { Warehouse, Plus, Minus, Search, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Product, StockAdjustment, CreateStockAdjustmentInput } from '../../../server/src/schema';

export function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state for stock adjustment
  const [adjustmentForm, setAdjustmentForm] = useState<CreateStockAdjustmentInput>({
    product_id: 0,
    adjustment_type: 'ADD',
    quantity: 0,
    reason: null
  });

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [productsResult, adjustmentsResult] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getStockAdjustments.query()
      ]);
      setProducts(productsResult);
      setFilteredProducts(productsResult);
      setStockAdjustments(adjustmentsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search products
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter((product: Product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchQuery))
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // Open adjustment dialog
  const openAdjustmentDialog = (product: Product, type: 'ADD' | 'REDUCE') => {
    setSelectedProduct(product);
    setAdjustmentForm({
      product_id: product.id,
      adjustment_type: type,
      quantity: 0,
      reason: null
    });
    setShowAdjustmentDialog(true);
  };

  // Create stock adjustment
  const handleStockAdjustment = async () => {
    if (adjustmentForm.quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    if (adjustmentForm.adjustment_type === 'REDUCE' && selectedProduct) {
      if (adjustmentForm.quantity > selectedProduct.stock_quantity) {
        alert('Cannot reduce more than current stock quantity.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const adjustment = await trpc.createStockAdjustment.mutate(adjustmentForm);
      setStockAdjustments((prev: StockAdjustment[]) => [adjustment, ...prev]);
      
      // Update product stock in local state
      setProducts((prev: Product[]) =>
        prev.map(p => {
          if (p.id === adjustmentForm.product_id) {
            const newQuantity = adjustmentForm.adjustment_type === 'ADD'
              ? p.stock_quantity + adjustmentForm.quantity
              : p.stock_quantity - adjustmentForm.quantity;
            return { ...p, stock_quantity: Math.max(0, newQuantity) };
          }
          return p;
        })
      );

      setShowAdjustmentDialog(false);
      setSelectedProduct(null);
      setAdjustmentForm({
        product_id: 0,
        adjustment_type: 'ADD',
        quantity: 0,
        reason: null
      });
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      alert('Failed to adjust stock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get stock status
  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Out of Stock', variant: 'destructive' as const, color: 'text-red-600' };
    if (quantity <= 5) return { status: 'Low Stock', variant: 'secondary' as const, color: 'text-orange-600' };
    if (quantity <= 10) return { status: 'Medium Stock', variant: 'secondary' as const, color: 'text-yellow-600' };
    return { status: 'In Stock', variant: 'default' as const, color: 'text-green-600' };
  };

  // Get product by ID for adjustment history
  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  // Calculate total stock value
  const totalStockValue = products.reduce((sum, product) => 
    sum + (product.stock_quantity * product.purchase_price), 0
  );

  const lowStockProducts = products.filter(p => p.stock_quantity <= 5);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header & Stats */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Management</h2>
          <p className="text-gray-600">Monitor and adjust your inventory levels</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Warehouse className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-xl font-bold">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-xl font-bold text-red-600">{outOfStockProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-xl font-bold text-orange-600">{lowStockProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Stock Value</p>
                  <p className="text-xl font-bold text-green-600">${totalStockValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products to adjust stock..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>Products & Stock Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Warehouse className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No products found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map((product: Product) => {
                    const stockStatus = getStockStatus(product.stock_quantity);
                    return (
                      <Card key={product.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{product.name}</h3>
                              {product.barcode && (
                                <p className="text-xs text-gray-500">{product.barcode}</p>
                              )}
                            </div>
                            <Badge variant={stockStatus.variant} className="ml-2">
                              {product.stock_quantity}
                            </Badge>
                          </div>

                          <div className="flex justify-between items-center mb-3">
                            <span className={`text-sm font-medium ${stockStatus.color}`}>
                              {stockStatus.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              Value: ${(product.stock_quantity * product.purchase_price).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustmentDialog(product, 'ADD')}
                              className="flex-1 text-green-600 hover:text-green-700"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Stock
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustmentDialog(product, 'REDUCE')}
                              disabled={product.stock_quantity === 0}
                              className="flex-1 text-red-600 hover:text-red-700"
                            >
                              <Minus className="w-3 h-3 mr-1" />
                              Reduce
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Stock Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {stockAdjustments.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No stock adjustments yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockAdjustments.map((adjustment: StockAdjustment) => (
                    <Card key={adjustment.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">
                            {getProductName(adjustment.product_id)}
                          </h4>
                          <Badge 
                            variant={adjustment.adjustment_type === 'ADD' ? 'default' : 'secondary'}
                            className={adjustment.adjustment_type === 'ADD' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {adjustment.adjustment_type === 'ADD' ? '+' : '-'}{adjustment.quantity}
                          </Badge>
                        </div>
                        
                        {adjustment.reason && (
                          <p className="text-xs text-gray-600 mb-2">{adjustment.reason}</p>
                        )}
                        
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span className="capitalize">
                            {adjustment.adjustment_type.toLowerCase()} Stock
                          </span>
                          <span>{adjustment.created_at.toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adjustmentForm.adjustment_type === 'ADD' ? 'Add Stock' : 'Reduce Stock'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct && (
                <span>
                  Adjust stock for: <strong>{selectedProduct.name}</strong>
                  <br />
                  Current stock: <strong>{selectedProduct.stock_quantity}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="adjustment_type">Adjustment Type</Label>
              <Select
                value={adjustmentForm.adjustment_type || 'ADD'}
                onValueChange={(value: 'ADD' | 'REDUCE') =>
                  setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({ ...prev, adjustment_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Add Stock</SelectItem>
                  <SelectItem value="REDUCE">Reduce Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={adjustmentForm.quantity || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({ 
                    ...prev, 
                    quantity: parseInt(e.target.value) || 0 
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for adjustment (e.g., damaged goods, restock, etc.)"
                value={adjustmentForm.reason || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({ 
                    ...prev, 
                    reason: e.target.value || null 
                  }))
                }
              />
            </div>

            {selectedProduct && adjustmentForm.quantity > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>Preview:</strong>
                </p>
                <p className="text-sm">
                  Current stock: {selectedProduct.stock_quantity}
                </p>
                <p className="text-sm">
                  After adjustment: {
                    adjustmentForm.adjustment_type === 'ADD'
                      ? selectedProduct.stock_quantity + adjustmentForm.quantity
                      : Math.max(0, selectedProduct.stock_quantity - adjustmentForm.quantity)
                  }
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdjustmentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockAdjustment}
              disabled={isLoading || adjustmentForm.quantity <= 0}
            >
              {isLoading ? 'Processing...' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
