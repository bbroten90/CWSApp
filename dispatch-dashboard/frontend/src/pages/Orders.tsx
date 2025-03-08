// src/pages/Orders.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios, { AxiosError } from 'axios';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose
} from '../components/ui';
import { Package, Search, Plus, Filter, Download, RefreshCw } from 'lucide-react';
import { Order, Warehouse, Customer } from '../types/models';

interface OrderFilters {
  warehouse_id: string;
  customer_id: string;
  status: string;
  start_date: string;
  end_date: string;
  [key: string]: string; // Add index signature
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface NewOrderForm {
  order_number: string;
  customer_id: string;
  pickup_warehouse_id: string;
  delivery_address: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal_code: string;
  pickup_date: string;
  delivery_date: string;
  total_weight: number;
  pallets: number;
  special_instructions: string;
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd')
  });
  
  // New order form
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState<NewOrderForm>({
    order_number: '',
    customer_id: '',
    pickup_warehouse_id: '',
    delivery_address: '',
    delivery_city: '',
    delivery_province: '',
    delivery_postal_code: '',
    pickup_date: format(new Date(), 'yyyy-MM-dd'),
    delivery_date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
    total_weight: 0,
    pallets: 0,
    special_instructions: ''
  });
  
  useEffect(() => {
    // Load initial data
    const fetchInitialData = async () => {
      try {
        const [warehousesRes, customersRes] = await Promise.all([
          axios.get<Warehouse[]>('/api/warehouses'),
          axios.get<Customer[]>('/api/customers')
        ]);
        
        setWarehouses(warehousesRes.data);
        setCustomers(customersRes.data);
        
        if (warehousesRes.data.length > 0) {
          setSelectedWarehouse(warehousesRes.data[0].warehouse_id);
          setNewOrderForm(prev => ({
            ...prev,
            pickup_warehouse_id: warehousesRes.data[0].warehouse_id
          }));
        }
        
        if (customersRes.data.length > 0) {
          setNewOrderForm(prev => ({
            ...prev,
            customer_id: customersRes.data[0].customer_id
          }));
        }
        
        // Load orders with default filters
        loadOrders();
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, []);
  
  const loadOrders = async () => {
    setLoading(true);
    try {
      const filters: OrderFilters = {
        warehouse_id: selectedWarehouse,
        customer_id: selectedCustomer,
        status: selectedStatus,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };
      
      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });
      
      const response = await axios.get<{data: {orders: Order[]}}>('/api/orders', { params: filters });
      setOrders(response.data.data.orders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters when they change
  useEffect(() => {
    if (warehouses.length > 0) {
      loadOrders();
    }
  }, [selectedWarehouse, selectedCustomer, selectedStatus, dateRange]);
  
  const handleNewOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await axios.post('/api/orders', newOrderForm);
      // Close dialog and reset form
      setShowNewOrderDialog(false);
      // Reload orders
      loadOrders();
      // Reset form
      setNewOrderForm({
        order_number: '',
        customer_id: newOrderForm.customer_id,
        pickup_warehouse_id: newOrderForm.pickup_warehouse_id,
        delivery_address: '',
        delivery_city: '',
        delivery_province: '',
        delivery_postal_code: '',
        pickup_date: format(new Date(), 'yyyy-MM-dd'),
        delivery_date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
        total_weight: 0,
        pallets: 0,
        special_instructions: ''
      });
    } catch (error) {
      console.error('Error creating order:', error);
      const axiosError = error as AxiosError;
      alert('Error creating order: ' + (axiosError.response?.data as any)?.message || axiosError.message);
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrderForm(prev => ({
      ...prev,
      [name]: name === 'total_weight' || name === 'pallets' ? parseFloat(value) : value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setNewOrderForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Export orders to CSV
  const exportOrdersCSV = () => {
    // Convert orders to CSV
    const headers = ['Order #', 'Customer', 'Warehouse', 'Delivery City', 'Province', 'Pickup Date', 'Delivery Date', 'Weight', 'Pallets', 'Status'];
    
    const csvRows = [
      headers.join(','),
      ...orders.map(order => [
        order.order_number,
        order.customer_name || '',
        order.warehouse_name || '',
        order.delivery_city,
        order.delivery_province,
        format(new Date(order.pickup_date), 'yyyy-MM-dd'),
        format(new Date(order.delivery_date), 'yyyy-MM-dd'),
        order.total_weight,
        order.pallets,
        order.status
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-gray-500">Manage and track all orders</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={loadOrders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={exportOrdersCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleNewOrderSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Order Number</label>
                      <Input 
                        name="order_number"
                        value={newOrderForm.order_number}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Customer</label>
                      <Select
                        value={newOrderForm.customer_id}
                        onValueChange={(value) => handleSelectChange('customer_id', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.customer_id} value={customer.customer_id}>
                              {customer.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Pickup Warehouse</label>
                      <Select
                        value={newOrderForm.pickup_warehouse_id}
                        onValueChange={(value) => handleSelectChange('pickup_warehouse_id', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Delivery City</label>
                      <Input 
                        name="delivery_city"
                        value={newOrderForm.delivery_city}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Province</label>
                      <Input 
                        name="delivery_province"
                        value={newOrderForm.delivery_province}
                        onChange={handleFormChange}
                        maxLength={2}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Postal Code</label>
                      <Input 
                        name="delivery_postal_code"
                        value={newOrderForm.delivery_postal_code}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Delivery Address</label>
                      <Input 
                        name="delivery_address"
                        value={newOrderForm.delivery_address}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Pickup Date</label>
                      <Input 
                        type="date"
                        name="pickup_date"
                        value={newOrderForm.pickup_date}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Delivery Date</label>
                      <Input 
                        type="date"
                        name="delivery_date"
                        value={newOrderForm.delivery_date}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Weight (lbs)</label>
                      <Input 
                        type="number"
                        name="total_weight"
                        value={newOrderForm.total_weight}
                        onChange={handleFormChange}
                        min="0"
                        step="0.1"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Pallets</label>
                      <Input 
                        type="number"
                        name="pallets"
                        value={newOrderForm.pallets}
                        onChange={handleFormChange}
                        min="0"
                        step="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Special Instructions</label>
                    <Input 
                      name="special_instructions"
                      value={newOrderForm.special_instructions}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Create Order</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Warehouse</label>
              <Select
                value={selectedWarehouse}
                onValueChange={setSelectedWarehouse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Customer</label>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.customer_id} value={customer.customer_id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Order Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="in_transit">In Transit</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <OrdersTable orders={orders} loading={loading} />
        </TabsContent>
        
        <TabsContent value="pending">
          <OrdersTable orders={orders.filter(o => o.status === 'pending')} loading={loading} />
        </TabsContent>
        
        <TabsContent value="assigned">
          <OrdersTable orders={orders.filter(o => o.status === 'assigned')} loading={loading} />
        </TabsContent>
        
        <TabsContent value="in_transit">
          <OrdersTable orders={orders.filter(o => o.status === 'in_transit')} loading={loading} />
        </TabsContent>
        
        <TabsContent value="delivered">
          <OrdersTable orders={orders.filter(o => o.status === 'delivered')} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Orders Table Component
const OrdersTable: React.FC<OrdersTableProps> = ({ orders, loading }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p>No orders found matching the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3">Order #</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Warehouse</th>
                  <th className="text-left p-3">Delivery Location</th>
                  <th className="text-left p-3">Pickup Date</th>
                  <th className="text-left p-3">Delivery Date</th>
                  <th className="text-right p-3">Weight (lbs)</th>
                  <th className="text-right p-3">Pallets</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{order.order_number}</td>
                    <td className="p-3">{order.customer_name || "Unknown"}</td>
                    <td className="p-3">{order.warehouse_name || "Unknown"}</td>
                    <td className="p-3">{order.delivery_city}, {order.delivery_province}</td>
                    <td className="p-3">{format(new Date(order.pickup_date), 'MMM d, yyyy')}</td>
                    <td className="p-3">{format(new Date(order.delivery_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-right">{order.total_weight.toLocaleString()}</td>
                    <td className="p-3 text-right">{order.pallets}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status || '')}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Orders;
