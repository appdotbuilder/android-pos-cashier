
import { useState } from 'react';
import { ProductManagement } from '@/components/ProductManagement';
import { POSSystem } from '@/components/POSSystem';
import { StockManagement } from '@/components/StockManagement';
import { Reports } from '@/components/Reports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Package, 
  ShoppingCart, 
  Warehouse, 
  BarChart3,
  Store
} from 'lucide-react';

type ViewType = 'pos' | 'products' | 'stock' | 'reports';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('pos');

  const navigationItems = [
    { id: 'pos' as ViewType, label: 'POS', icon: ShoppingCart, color: 'bg-green-500' },
    { id: 'products' as ViewType, label: 'Products', icon: Package, color: 'bg-blue-500' },
    { id: 'stock' as ViewType, label: 'Stock', icon: Warehouse, color: 'bg-orange-500' },
    { id: 'reports' as ViewType, label: 'Reports', icon: BarChart3, color: 'bg-purple-500' },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'pos':
        return <POSSystem />;
      case 'products':
        return <ProductManagement />;
      case 'stock':
        return <StockManagement />;
      case 'reports':
        return <Reports />;
      default:
        return <POSSystem />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">POS System</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 min-w-0 whitespace-nowrap ${
                    isActive ? item.color : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="min-h-[calc(100vh-200px)]">
          {renderCurrentView()}
        </Card>
      </div>
    </div>
  );
}

export default App;
