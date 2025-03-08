// src/components/RateCalculator.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Alert,
  AlertTitle,
  AlertDescription
} from '../components/ui';
import { Calculator, DollarSign, Warehouse, TruckIcon } from 'lucide-react';

// Types
interface Warehouse {
  warehouseId: string;
  name: string;
}

interface Customer {
  customerId: string;
  name: string;
}

interface RateCalculation {
  originWarehouseId: string;
  destinationCity: string;
  destinationProvince: string;
  weightLbs: number;
  rate: number | null;
  totalCost: number | null;
  weightCategory: string | null;
  isTruckload: boolean;
  customerName: string;
}

const RateCalculator: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RateCalculation | null>(null);
  
  const [formData, setFormData] = useState({
    originWarehouseId: '',
    destinationCity: '',
    destinationProvince: '',
    weightLbs: 0,
    isTruckload: false,
    customerName: ''
  });
  
  // Fetch warehouses and customers on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [warehousesRes, customersRes] = await Promise.all([
          axios.get('/api/warehouses'),
          axios.get('/api/rates/customers')
        ]);
        
        setWarehouses(warehousesRes.data);
        setCustomers(customersRes.data);
        
        // Set default values if available
        if (warehousesRes.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            originWarehouseId: warehousesRes.data[0].warehouseId
          }));
        }
        
        if (customersRes.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            customerName: customersRes.data[0].name
          }));
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load initial data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : 
              name === 'weightLbs' ? parseFloat(value) || 0 : value
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const calculateRate = async () => {
    // Validate input
    if (!formData.originWarehouseId) {
      setError('Please select an origin warehouse');
      return;
    }
    
    if (!formData.destinationCity) {
      setError('Please enter a destination city');
      return;
    }
    
    if (!formData.destinationProvince) {
      setError('Please enter a destination province');
      return;
    }
    
    if (!formData.customerName) {
      setError('Please select a customer');
      return;
    }
    
    if (formData.weightLbs <= 0 && !formData.isTruckload) {
      setError('Please enter a valid weight greater than 0');
      return;
    }
    
    setCalculating(true);
    setError(null);
    
    try {
      // Call API to calculate rate
      const response = await axios.post('/api/rates/calculate', formData);
      
      setResult({
        ...formData,
        rate: response.data.rate,
        totalCost: response.data.totalCost,
        weightCategory: response.data.weightCategory,
        isTruckload: formData.isTruckload
      });
    } catch (err) {
      console.error('Error calculating rate:', err);
      setError('Failed to calculate shipping rate. Please try again.');
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };
  
  const getWeightCategory = (weight: number): string => {
    if (weight < 2000) return '0-1,999 lbs';
    if (weight < 5000) return '2,000-4,999 lbs';
    if (weight < 10000) return '5,000-9,999 lbs';
    if (weight < 20000) return '10,000-19,999 lbs';
    if (weight < 30000) return '20,000-29,999 lbs';
    if (weight < 40000) return '30,000-39,999 lbs';
    return '40,000+ lbs';
  };
  
  const renderResultCard = () => {
    if (!result || (!result.rate && !result.isTruckload)) return null;
    
    return (
      <div className="mt-6">
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              {result.isTruckload ? 
                <TruckIcon className="h-5 w-5 mr-2" /> :
                <DollarSign className="h-5 w-5 mr-2" />
              }
              Shipping Rate Calculation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Route</p>
                <p className="font-medium">
                  {warehouses.find(w => w.warehouseId === result.originWarehouseId)?.name || 'Unknown'} to {result.destinationCity}, {result.destinationProvince}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{result.customerName}</p>
              </div>
              
              {result.isTruckload ? (
                <div>
                  <p className="text-sm text-gray-500">Truckload Rate</p>
                  <p className="font-medium text-2xl">${result.totalCost?.toFixed(2)}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="font-medium">{result.weightLbs.toLocaleString()} lbs ({getWeightCategory(result.weightLbs)})</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Rate</p>
                    <p className="font-medium">${result.rate?.toFixed(4)} per lb</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Total Cost</p>
                    <p className="font-medium text-2xl">${result.totalCost?.toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Shipping Rate Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="customerName">Customer</Label>
              <Select
                value={formData.customerName}
                onValueChange={(value: string) => handleSelectChange('customerName', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.customerId} value={customer.name}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="originWarehouseId">Origin Warehouse</Label>
              <Select
                value={formData.originWarehouseId}
                onValueChange={(value: string) => handleSelectChange('originWarehouseId', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="destinationCity">Destination City</Label>
                <Input
                  id="destinationCity"
                  name="destinationCity"
                  value={formData.destinationCity}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <Label htmlFor="destinationProvince">Province</Label>
                <Input
                  id="destinationProvince"
                  name="destinationProvince"
                  value={formData.destinationProvince}
                  onChange={handleInputChange}
                  placeholder="Enter province"
                  maxLength={10} // Per your schema
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="isTruckload"
                name="isTruckload"
                checked={formData.isTruckload}
                onChange={handleInputChange}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isTruckload" className="cursor-pointer">
                Truckload Rate (TL)
              </Label>
            </div>
            
            {!formData.isTruckload && (
              <div>
                <Label htmlFor="weightLbs">Weight (lbs)</Label>
                <Input
                  id="weightLbs"
                  name="weightLbs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weightLbs || ''}
                  onChange={handleInputChange}
                  placeholder="Enter weight in pounds"
                />
              </div>
            )}
            
            <Button 
              onClick={calculateRate} 
              disabled={calculating || loading}
              className="mt-2"
            >
              {calculating ? 'Calculating...' : 'Calculate Rate'}
            </Button>
          </div>
          
          {renderResultCard()}
        </CardContent>
      </Card>
    </div>
  );
};

export default RateCalculator;
