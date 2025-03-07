// src/pages/LoadBuilder.tsx
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Order, Warehouse, Vehicle, SuggestedLoad } from '../types/models';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Alert, AlertTitle, AlertDescription,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../components/ui';
import { Truck, Package, ArrowRight, Save, RefreshCw, RotateCw, MapPin } from 'lucide-react';


// Define item types for drag and drop
const ItemTypes = {
  ORDER: 'order'
};

// Draggable Order Item Component
const DraggableOrderItem = ({ order, onAddOrder }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ORDER,
    item: { order },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (item && dropResult) {
        onAddOrder(order);
      }
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag} 
      className={`p-3 border-b hover:bg-gray-100 cursor-move ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{order.order_number}</p>
          <p className="text-sm text-gray-500">{order.delivery_city}, {order.delivery_province}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{order.total_weight.toLocaleString()} lbs</p>
          <p className="text-sm text-gray-500">{order.pallets} pallets</p>
        </div>
      </div>
    </div>
  );
};

// Order List Component
const OrderList = ({ orders, onAddOrder }) => {
  return (
    <div className="overflow-y-auto max-h-[600px]">
      {orders.map(order => (
        <DraggableOrderItem 
          key={order.id} 
          order={order} 
          onAddOrder={onAddOrder}
        />
      ))}
    </div>
  );
};

// Load Drop Target
const LoadDropTarget = ({ children, onDrop, isActive }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ORDER,
    drop: () => ({ name: 'LoadDropTarget' }),
    canDrop: () => isActive,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div 
      ref={drop} 
      className={`h-full ${isOver && isActive ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
    >
      {children}
    </div>
  );
};

// Suggested Load Item Component
const SuggestedLoadItem = ({ suggestedLoad, onApplySuggestion }) => {
  return (
    <div className="border rounded-md p-3 mb-3 bg-gray-50 hover:bg-gray-100">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Suggested Load ({suggestedLoad.orders.length} orders)</h4>
        <Button size="sm" onClick={() => onApplySuggestion(suggestedLoad)}>Apply</Button>
      </div>
      <div className="text-sm">
        <div className="grid grid-cols-3 gap-2 mb-1">
          <div>
            <span className="text-gray-500">Weight:</span> {suggestedLoad.totalWeight.toLocaleString()} lbs
          </div>
          <div>
            <span className="text-gray-500">Pallets:</span> {suggestedLoad.totalPallets}
          </div>
          <div>
            <span className="text-gray-500">Efficiency:</span> {suggestedLoad.efficiencyScore}%
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {suggestedLoad.orders.map(order => (
            <span key={order.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {order.order_number}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const LoadBuilder = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [suggestedLoads, setSuggestedLoads] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const mapRef = useRef(null);
  const [activeView, setActiveView] = useState('builder'); // 'builder' or 'map'
  
  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const warehousesRes = await axios.get('/api/warehouses');
        setWarehouses(warehousesRes.data);
        
        if (warehousesRes.data.length > 0) {
          setSelectedWarehouse(warehousesRes.data[0].warehouse_id);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load warehouses. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Load vehicles and orders when warehouse or date changes
  useEffect(() => {
    if (selectedWarehouse && selectedDate) {
      loadWarehouseData();
    }
  }, [selectedWarehouse, selectedDate]);
  
  const loadWarehouseData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, ordersRes] = await Promise.all([
        axios.get(`/api/vehicles?warehouse_id=${selectedWarehouse}&status=active`),
        axios.get(`/api/orders?warehouse_id=${selectedWarehouse}&pickup_date=${selectedDate}&status=pending`)
      ]);
      
      setVehicles(vehiclesRes.data.data.vehicles);
      setPendingOrders(ordersRes.data.data.orders);
      
      // Clear selected vehicle and orders when warehouse changes
      setSelectedVehicle('');
      setSelectedOrders([]);
      setSuggestedLoads([]);
      setError(null);
    } catch (error) {
      console.error('Error loading warehouse data:', error);
      setError('Failed to load vehicles or orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const generateSuggestedLoads = async () => {
    if (!selectedWarehouse) {
      setError('Please select a warehouse first');
      return;
    }
    
    setOptimizing(true);
    try {
      // Call the optimization endpoint
      const response = await axios.post('/api/optimize/loads', {
        warehouseId: selectedWarehouse,
        date: selectedDate
      });
      
      // Set the suggested loads
      setSuggestedLoads(response.data.suggestedLoads);
      setError(null);
    } catch (error) {
      console.error('Error generating suggested loads:', error);
      setError('Failed to generate suggested loads. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };
  
  const applyLoadSuggestion = (suggestedLoad) => {
    // Check if a vehicle is selected
    if (!selectedVehicle) {
      // Find a suitable vehicle based on the suggested load
      const suitableVehicle = vehicles.find(v => 
        v.capacity_weight >= suggestedLoad.totalWeight && 
        v.capacity_pallets >= suggestedLoad.totalPallets
      );
      
      if (suitableVehicle) {
        setSelectedVehicle(suitableVehicle.id);
      } else {
        setError('No suitable vehicle found for this suggested load');
        return;
      }
    }
    
    // Apply the suggested orders
    setSelectedOrders(suggestedLoad.orders);
    
    // Remove the selected orders from the pending list
    const orderIds = new Set(suggestedLoad.orders.map(o => o.id));
    setPendingOrders(pendingOrders.filter(o => !orderIds.has(o.id)));
  };
  
  const handleAddOrder = (order) => {
    // Calculate if adding this order would exceed vehicle capacity
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }
    
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    const currentWeight = selectedOrders.reduce((sum, o) => sum + o.total_weight, 0);
    const currentPallets = selectedOrders.reduce((sum, o) => sum + o.pallets, 0);
    
    if (currentWeight + order.total_weight > vehicle.capacity_weight) {
      setError('Adding this order would exceed vehicle weight capacity');
      return;
    }
    
    if (currentPallets + order.pallets > vehicle.capacity_pallets) {
      setError('Adding this order would exceed vehicle pallet capacity');
      return;
    }
    
    // Add order to selected orders
    setSelectedOrders([...selectedOrders, order]);
    
    // Remove from pending orders
    setPendingOrders(pendingOrders.filter(o => o.id !== order.id));
    
    setError(null);
  };
  
  const handleRemoveOrder = (order) => {
    // Remove from selected orders
    setSelectedOrders(selectedOrders.filter(o => o.id !== order.id));
    
    // Add back to pending orders
    setPendingOrders([...pendingOrders, order]);
    
    setError(null);
  };
  
  const handleSaveShipment = async () => {
    if (!selectedVehicle || selectedOrders.length === 0) {
      setError('Please select a vehicle and at least one order');
      return;
    }
    
    setSaving(true);
    try {
      // Create shipment
      const shipmentData = {
        origin_warehouse_id: selectedWarehouse,
        vehicle_id: selectedVehicle,
        planned_date: selectedDate,
        orders: selectedOrders.map(order => order.id)
      };
      
      const response = await axios.post('/api/shipments', shipmentData);
      
      // Clear selected orders
      setSelectedOrders([]);
      
      // Show success message
      setSuccessMessage(`Shipment ${response.data.data.shipment.shipment_number} created successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      setError(null);
    } catch (error) {
      console.error('Error creating shipment:', error);
      setError('Failed to create shipment. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Calculate totals for the current load
  const currentWeight = selectedOrders.reduce((sum, order) => sum + order.total_weight, 0);
  const currentPallets = selectedOrders.reduce((sum, order) => sum + order.pallets, 0);
  const selectedVehicleInfo = selectedVehicle ? vehicles.find(v => v.id === selectedVehicle) : null;
  
  // Calculate percentage of capacity used
  const weightPercentage = selectedVehicleInfo ? (currentWeight / selectedVehicleInfo.capacity_weight) * 100 : 0;
  const palletPercentage = selectedVehicleInfo ? (currentPallets / selectedVehicleInfo.capacity_pallets) * 100 : 0;
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto p-4">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Load Builder</h1>
            <p className="text-gray-500">Create and optimize shipments</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={loadWarehouseData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            
            <Button 
              variant={optimizing ? 'outline' : 'default'} 
              onClick={generateSuggestedLoads}
              disabled={optimizing || !selectedWarehouse}
            >
              <RotateCw className={`h-4 w-4 mr-2 ${optimizing ? 'animate-spin' : ''}`} />
              {optimizing ? 'Optimizing...' : 'Generate Suggestions'}
            </Button>
          </div>
        </header>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select
              value={selectedWarehouse}
              onValueChange={setSelectedWarehouse}
              disabled={loading}
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
            <Label htmlFor="date">Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="vehicle">Vehicle</Label>
            <Select
              value={selectedVehicle}
              onValueChange={setSelectedVehicle}
              disabled={loading || vehicles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} ({vehicle.make} {vehicle.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              className="w-full" 
              onClick={handleSaveShipment}
              disabled={saving || !selectedVehicle || selectedOrders.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Shipment
            </Button>
          </div>
        </div>
        
        <Tabs value={activeView} onValueChange={setActiveView} className="mb-4">
          <TabsList>
            <TabsTrigger value="builder">Load Builder</TabsTrigger>
            <TabsTrigger value="map">Route Map</TabsTrigger>
          </TabsList>
          
          <TabsContent value="builder" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Available Orders - 1/3 width */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Available Orders ({pendingOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No pending orders available</p>
                    </div>
                  ) : (
                    <OrderList 
                      orders={pendingOrders} 
                      onAddOrder={handleAddOrder} 
                    />
                  )}
                </CardContent>
              </Card>
              
              {/* Load Builder - 2/3 width */}
              <div className="lg:col-span-2">
                {/* Current Load */}
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Current Load ({selectedOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LoadDropTarget 
                      onDrop={() => {}} 
                      isActive={!!selectedVehicle}
                    >
                      {!selectedVehicle ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>Please select a vehicle first</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Weight Capacity</p>
                              <div className="flex items-center justify-between">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                  <div 
                                    className={`h-2.5 rounded-full ${weightPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(weightPercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-sm whitespace-nowrap">
                                  {currentWeight.toLocaleString()} / {selectedVehicleInfo.capacity_weight.toLocaleString()} lbs
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-500">Pallet Capacity</p>
                              <div className="flex items-center justify-between">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                  <div 
                                    className={`h-2.5 rounded-full ${palletPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(palletPercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-sm whitespace-nowrap">
                                  {currentPallets} / {selectedVehicleInfo.capacity_pallets}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {selectedOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
                              <p>Drag orders here to add them to this load</p>
                            </div>
                          ) : (
                            <div className="overflow-y-auto max-h-[300px]">
                              <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="text-left p-2">Order #</th>
                                    <th className="text-left p-2">Destination</th>
                                    <th className="text-right p-2">Weight</th>
                                    <th className="text-right p-2">Pallets</th>
                                    <th className="p-2"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedOrders.map((order, index) => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                      <td className="p-2">{order.order_number}</td>
                                      <td className="p-2">{order.delivery_city}, {order.delivery_province}</td>
                                      <td className="p-2 text-right">{order.total_weight.toLocaleString()}</td>
                                      <td className="p-2 text-right">{order.pallets}</td>
                                      <td className="p-2 text-right">
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={() => handleRemoveOrder(order)}
                                        >
                                          <span className="text-red-500">×</span>
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </LoadDropTarget>
                  </CardContent>
                </Card>
                
                {/* Suggested Loads */}
                {suggestedLoads.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center">
                        <MapPin className="h-5 w-5 mr-2" />
                        Suggested Loads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {suggestedLoads.map((load, index) => (
                        <SuggestedLoadItem 
                          key={index} 
                          suggestedLoad={load} 
                          onApplySuggestion={applyLoadSuggestion} 
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="map" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Route Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] bg-gray-100 flex items-center justify-center">
                  {selectedOrders.length === 0 ? (
                    <p className="text-gray-500">Add orders to visualize the route</p>
                  ) : (
                    <div className="w-full h-full" id="map" ref={mapRef}>
                      {/* Map will be initialized here */}
                      <div className="flex items-center justify-center h-full">
                        <p>Loading map...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DndProvider>
  );
};

export default LoadBuilder;
