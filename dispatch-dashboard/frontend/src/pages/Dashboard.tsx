// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Button,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui';
import { MapPin, Truck, Package, DollarSign, Calendar, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [warehouses, setWarehouses] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [plannedShipments, setPlannedShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch warehouses when component mounts
    const fetchWarehouses = async () => {
      try {
        const response = await axios.get('/api/warehouses');
        setWarehouses(response.data);
        if (response.data.length > 0) {
          setSelectedWarehouse(response.data[0].warehouse_id);
        }
      } catch (error) {
        console.error('Error fetching warehouses:', error);
      }
    };
    
    fetchWarehouses();
  }, []);
  
  useEffect(() => {
    // Load dashboard data when selectedWarehouse or selectedDate changes
    if (selectedWarehouse) {
      loadDashboardData();
    }
  }, [selectedWarehouse, selectedDate]);
  
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      const [ordersRes, shipmentsRes] = await Promise.all([
        axios.get(`/api/orders?warehouse_id=${selectedWarehouse}&pickup_date=${formattedDate}&status=pending`),
        axios.get(`/api/shipments?origin_warehouse_id=${selectedWarehouse}&planned_date=${formattedDate}`)
      ]);
      
      setPendingOrders(ordersRes.data.data.orders);
      setPlannedShipments(shipmentsRes.data.data.shipments);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
  };
  
  const handleOptimizeClick = async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await axios.post(`/api/shipments/optimize`, {
        warehouseId: selectedWarehouse,
        date: formattedDate
      });
      
      // Reload data after optimization
      await loadDashboardData();
    } catch (error) {
      console.error('Error optimizing loads:', error);
    }
  };
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };
  
  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Dashboard</h1>
          <p className="text-gray-500">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <Select
              value={selectedWarehouse}
              onValueChange={handleWarehouseChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse: any) => (
                  <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
              className="border rounded p-2"
            />
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <Button 
            onClick={handleOptimizeClick}
            className="bg-primary"
          >
            Optimize Loads
          </Button>
        </div>
      </header>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                <h2 className="text-3xl font-bold">{pendingOrders.length}</h2>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Planned Shipments</p>
                <h2 className="text-3xl font-bold">{plannedShipments.length}</h2>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Weight (lbs)</p>
                <h2 className="text-3xl font-bold">
                  {pendingOrders.reduce((sum: number, order: any) => sum + order.total_weight, 0).toLocaleString()}
                </h2>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Revenue</p>
                <h2 className="text-3xl font-bold">
                  {formatCurrency(plannedShipments.reduce((sum: number, shipment: any) => sum + shipment.total_revenue, 0))}
                </h2>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Pending Orders</TabsTrigger>
          <TabsTrigger value="shipments">Planned Shipments</TabsTrigger>
        </TabsList>
        
        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pending Orders ({pendingOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                  <p>No pending orders for this date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Order #</th>
                        <th className="text-left py-2">Manufacturer</th>
                        <th className="text-left py-2">Destination</th>
                        <th className="text-right py-2">Weight (lbs)</th>
                        <th className="text-right py-2">Pallets</th>
                        <th className="text-left py-2">Special Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map((order: any) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{order.order_number}</td>
                          <td className="py-2">{order.customer_name || "Unknown"}</td>
                          <td className="py-2">{order.delivery_city}, {order.delivery_province}</td>
                          <td className="py-2 text-right">{order.total_weight.toLocaleString()}</td>
                          <td className="py-2 text-right">{order.pallets}</td>
                          <td className="py-2">{order.special_instructions || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Planned Shipments ({plannedShipments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : plannedShipments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                  <p>No shipments planned for this date.</p>
                  <Button variant="outline" className="mt-4" onClick={handleOptimizeClick}>
                    Optimize Loads Now
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Shipment #</th>
                        <th className="text-left py-2">Vehicle</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-right py-2">Orders</th>
                        <th className="text-right py-2">Weight (lbs)</th>
                        <th className="text-right py-2">Pallets</th>
                        <th className="text-right py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plannedShipments.map((shipment: any) => (
                        <tr key={shipment.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{shipment.shipment_number}</td>
                          <td className="py-2">{shipment.vehicle_number || "Not assigned"}</td>
                          <td className="py-2">{shipment.status}</td>
                          <td className="py-2 text-right">{shipment.order_count || 0}</td>
                          <td className="py-2 text-right">{shipment.total_weight.toLocaleString()}</td>
                          <td className="py-2 text-right">{shipment.total_pallets}</td>
                          <td className="py-2 text-right">{formatCurrency(shipment.total_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;