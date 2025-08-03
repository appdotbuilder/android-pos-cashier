
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import { Plus, Package, Edit, Search, Hash } from 'lucide-react';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Form state for new product
  const [newProductForm, setNewProductForm] = useState<CreateProductInput>({
    name: '',
    barcode: null,
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0
  });

  // Form state for editing product
  const [editProductForm, setEditProductForm] = useState<UpdateProductInput>({
    id: 0,
    name: '',
    barcode: null,
    purchase_price: 0,
    selling_price: 0,
    stock_quantity: 0
  });

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
      setFilteredProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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

  // Create product
  const handleCreateProduct = async () => {
    if (!newProductForm.name.trim()) {
      alert('Product name is required.');
      return;
    }

    if (newProductForm.selling_price <= 0) {
      alert('Selling price must be greater than 0.');
      return;
    }

    setIsLoading(true);
    try {
      const product = await trpc.createProduct.mutate(newProductForm);
      setProducts((prev: Product[]) => [...prev, product]);
      setNewProductForm({
        name: '',
        barcode: null,
        purchase_price: 0,
        selling_price: 0,
        stock_quantity: 0
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update product
  const handleUpdateProduct = async () => {
    if (!editProductForm.name?.trim()) {
      alert('Product name is required.');
      return;
    }

    if (editProductForm.selling_price && editProductForm.selling_price <= 0) {
      alert('Selling price must be greater than 0.');
      return;
    }

    setIsLoading(true);
    try {
      const updatedProduct = await trpc.updateProduct.mutate(editProductForm);
      setProducts((prev: Product[]) =>
        prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
      );
      setShowEditDialog(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditProductForm({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity
    });
    setShowEditDialog(true);
  };

  // Calculate profit margin
  const calculateProfitMargin = (purchase: number, selling: number) => {
    if (purchase === 0) return 0;
    return ((selling - purchase) / purchase * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product in your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter product name"
                  value={newProductForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProductForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  placeholder="Enter barcode (optional)"
                  value={newProductForm.barcode || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProductForm((prev: CreateProductInput) => ({ 
                      ...prev, 
                      barcode: e.target.value || null 
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_price">Purchase Price</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newProductForm.purchase_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewProductForm((prev: CreateProductInput) => ({ 
                        ...prev, 
                        purchase_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="selling_price">Selling Price *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newProductForm.selling_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewProductForm((prev: CreateProductInput) => ({ 
                        ...prev, 
                        selling_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stock_quantity">Initial Stock</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newProductForm.stock_quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewProductForm((prev: CreateProductInput) => ({ 
                      ...prev, 
                      stock_quantity: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateProduct}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating...' : 'Create Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products by name or barcode..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Products ({filteredProducts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No products found' : 'No products yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search criteria'
                    : 'Get started by adding your first product'
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product: Product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg truncate pr-2">
                          {product.name}
                        </h3>
                        <Badge 
                          variant={product.stock_quantity > 10 ? 'default' : 
                                   product.stock_quantity > 0 ? 'secondary' : 'destructive'}
                        >
                          {product.stock_quantity}
                        </Badge>
                      </div>

                      {product.barcode && (
                        <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
                          <Hash className="w-3 h-3" />
                          <span>{product.barcode}</span>
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Purchase:</span>
                          <span>${product.purchase_price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Selling:</span>
                          <span className="font-semibold text-green-600">
                            ${product.selling_price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Profit:</span>
                          
                          <span className="text-sm">
                            {calculateProfitMargin(product.purchase_price, product.selling_price).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500 mt-2">
                        Created: {product.created_at.toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_name">Product Name *</Label>
                <Input
                  id="edit_name"
                  placeholder="Enter product name"
                  value={editProductForm.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditProductForm((prev: UpdateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit_barcode">Barcode</Label>
                <Input
                  id="edit_barcode"
                  placeholder="Enter barcode (optional)"
                  value={editProductForm.barcode || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditProductForm((prev: UpdateProductInput) => ({ 
                      ...prev, 
                      barcode: e.target.value || null 
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_purchase_price">Purchase Price</Label>
                  <Input
                    id="edit_purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editProductForm.purchase_price || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditProductForm((prev: UpdateProductInput) => ({ 
                        ...prev, 
                        purchase_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit_selling_price">Selling Price *</Label>
                  <Input
                    id="edit_selling_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={editProductForm.selling_price || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditProductForm((prev: UpdateProductInput) => ({ 
                        ...prev, 
                        selling_price: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_stock_quantity">Stock Quantity</Label>
                <Input
                  id="edit_stock_quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editProductForm.stock_quantity || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditProductForm((prev: UpdateProductInput) => ({ 
                      ...prev, 
                      stock_quantity: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProduct}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
