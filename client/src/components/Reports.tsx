
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Download,
  RefreshCw
} from 'lucide-react';
import type { 
  SalesReport, 
  ProfitLossReport, 
  StockReport,
  ReportDateRangeInput 
} from '../../../server/src/schema';

export function Reports() {
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [profitLossReports, setProfitLossReports] = useState<ProfitLossReport[]>([]);
  const [stockReports, setStockReports] = useState<StockReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  
  // Date range for reports
  const [dateRange, setDateRange] = useState<ReportDateRangeInput>({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // Monthly report params
  const [monthlyParams, setMonthlyParams] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  // Load reports
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      if (reportType === 'daily') {
        const [salesResult, profitLossResult] = await Promise.all([
          trpc.getDailySalesReport.query(dateRange),
          trpc.getDailyProfitLossReport.query(dateRange)
        ]);
        setSalesReports(salesResult);
        setProfitLossReports(profitLossResult);
      } else {
        // Monthly reports return single objects, not arrays
        const [salesResult, profitLossResult] = await Promise.all([
          trpc.getMonthlySalesReport.query(monthlyParams),
          trpc.getMonthlyProfitLossReport.query(monthlyParams)
        ]);
        // Convert single objects to arrays for consistent handling
        setSalesReports([salesResult]);
        setProfitLossReports([profitLossResult]);
      }

      // Load stock report (always current)
      const stockResult = await trpc.getStockReport.query();
      setStockReports(stockResult);
      
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dateRange, monthlyParams]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Calculate totals
  const totalRevenue = salesReports.reduce((sum, report) => sum + report.total_revenue, 0);
  const totalTransactions = salesReports.reduce((sum, report) => sum + report.total_transactions, 0);
  const totalProfit = profitLossReports.reduce((sum, report) => sum + report.net_profit, 0);

  // Stock summary
  const totalStockValue = stockReports.reduce((sum, report) => sum + report.stock_value, 0);
  const lowStockItems = stockReports.filter(report => report.current_stock <= 5);
  const outOfStockItems = stockReports.filter(report => report.current_stock === 0);

  // Export to CSV function
  const exportToCSV = (data: SalesReport[] | ProfitLossReport[] | StockReport[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => (row as Record<string, unknown>)[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Track your business performance</p>
        </div>
        
        <Button onClick={loadReports} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Report Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select
                value={reportType}
                onValueChange={(value: 'daily' | 'monthly') => setReportType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Reports</SelectItem>
                  <SelectItem value="monthly">Monthly Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'daily' ? (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDateRange((prev: ReportDateRangeInput) => ({ ...prev, start_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDateRange((prev: ReportDateRangeInput) => ({ ...prev, end_date: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2030"
                    value={monthlyParams.year}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMonthlyParams(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))
                    }
                  />
                </div>
                <div>
                  <Label>Month</Label>
                  <Select
                    value={monthlyParams.month.toString()}
                    onValueChange={(value: string) =>
                      setMonthlyParams(prev => ({ ...prev, month: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-xl font-bold text-blue-600">${totalProfit.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-xl font-bold">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Stock Value</p>
                <p className="text-xl font-bold text-orange-600">${totalStockValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales Reports</TabsTrigger>
          <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
          <TabsTrigger value="stock">Stock Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Sales Report</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(salesReports, 'sales_report')}
              disabled={salesReports.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[400px]">
                {salesReports.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No sales data available for this period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesReports.map((report: SalesReport, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                {reportType === 'daily' ? 'Date' : 'Month'}
                              </p>
                              <p className="font-semibold">
                                {reportType === 'daily' 
                                  ? report.date 
                                  : new Date(report.date + '-01').toLocaleDateString('default', { 
                                      year: 'numeric', 
                                      month: 'long' 
                                    })
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Sales</p>
                              <p className="font-semibold">{report.total_sales}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Revenue</p>
                              <p className="font-semibold text-green-600">${report.total_revenue.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Transactions</p>
                              <p className="font-semibold">{report.total_transactions}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Profit & Loss Report</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(profitLossReports, 'profit_loss_report')}
              disabled={profitLossReports.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[400px]">
                {profitLossReports.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No profit/loss data available for this period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profitLossReports.map((report: ProfitLossReport, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                {reportType === 'daily' ? 'Date' : 'Month'}
                              </p>
                              <p className="font-semibold">
                                {reportType === 'daily' 
                                  ? report.date 
                                  : new Date(report.date + '-01').toLocaleDateString('default', { 
                                      year: 'numeric', 
                                      month: 'long' 
                                    })
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Revenue</p>
                              <p className="font-semibold text-green-600">${report.revenue.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">COGS</p>
                              <p className="font-semibold text-red-600">${report.cost_of_goods_sold.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Net Profit</p>
                              <p className={`font-semibold ${report.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${report.net_profit.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Transactions</p>
                              <p className="font-semibold">{report.total_transactions}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Stock Report</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(stockReports, 'stock_report')}
              disabled={stockReports.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stock Alerts */}
          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outOfStockItems.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 text-sm">Out of Stock Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {outOfStockItems.slice(0, 5).map((item: StockReport) => (
                        <div key={item.product_id} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.product_name}</span>
                          <Badge variant="destructive">0</Badge>
                        </div>
                      ))}
                      {outOfStockItems.length > 5 && (
                        <p className="text-xs text-gray-500">+{outOfStockItems.length - 5} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {lowStockItems.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-orange-600 text-sm">Low Stock Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {lowStockItems.slice(0, 5).map((item: StockReport) => (
                        <div key={item.product_id} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.product_name}</span>
                          <Badge variant="secondary">{item.current_stock}</Badge>
                        </div>
                      ))}
                      {lowStockItems.length > 5 && (
                        <p className="text-xs text-gray-500">+{lowStockItems.length - 5} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[400px]">
                {stockReports.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No stock data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stockReports.map((report: StockReport) => (
                      <Card key={report.product_id} className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Product</p>
                              <p className="font-semibold">{report.product_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Stock</p>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">{report.current_stock}</span>
                                <Badge 
                                  variant={report.current_stock > 10 ? 'default' : 
                                           report.current_stock > 0 ? 'secondary' : 'destructive'}
                                >
                                  {report.current_stock === 0 ? 'Out' : 
                                   report.current_stock <= 5 ? 'Low' : 'Good'}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Purchase Price</p>
                              <p className="font-semibold">${report.purchase_price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Selling Price</p>
                              <p className="font-semibold text-green-600">${report.selling_price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Stock Value</p>
                              <p className="font-semibold text-purple-600">${report.stock_value.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
