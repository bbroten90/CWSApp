// src/components/ShipmentRouteViewer.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ShipmentMap from './ShipmentMap';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';

interface ShipmentRouteViewerProps {
  shipmentId: number;
}

const ShipmentRouteViewer: React.FC<ShipmentRouteViewerProps> = ({ shipmentId }) => {
  const [routeData, setRouteData] = useState<any>(null);
  const [vehicleLocations, setVehicleLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRouteData = async () => {
      setLoading(true);
      try {
        // Fetch shipment route data
        const { data } = await axios.get(`/api/shipments/${shipmentId}/route`);
        setRouteData(data);
        
        // If the shipment has assigned vehicles, fetch their current locations
        if (data.truckId) {
          const vehicleRes = await axios.get(`/api/vehicles/${data.truckId}/location`);
          if (vehicleRes.data) {
            setVehicleLocations([{
              id: data.truckId,
              lat: vehicleRes.data.latitude,
              lng: vehicleRes.data.longitude,
              info: `${vehicleRes.data.status} - Last updated: ${new Date(vehicleRes.data.timestamp).toLocaleTimeString()}`
            }]);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching route data:', err);
        setError('Unable to load route data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRouteData();
    
    // Refresh vehicle locations every 2 minutes
    const intervalId = setInterval(() => {
      if (routeData?.truckId) {
        axios.get(`/api/vehicles/${routeData.truckId}/location`)
          .then(res => {
            if (res.data) {
              setVehicleLocations([{
                id: routeData.truckId,
                lat: res.data.latitude,
                lng: res.data.longitude,
                info: `${res.data.status} - Last updated: ${new Date(res.data.timestamp).toLocaleTimeString()}`
              }]);
            }
          })
          .catch(err => console.error('Error updating vehicle location:', err));
      }
    }, 120000);
    
    return () => clearInterval(intervalId);
  }, [shipmentId]);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipment Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipment Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }
  
  if (!routeData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipment Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No route data available for this shipment.</div>
        </CardContent>
      </Card>
    );
  }
  
  // Transform the route data to the format expected by ShipmentMap
  const mapRoutes = [{
    origin: {
      lat: routeData.warehouse.latitude,
      lng: routeData.warehouse.longitude,
      name: routeData.warehouse.name,
      type: 'warehouse' as const
    },
    stops: routeData.stops.map((stop: any) => ({
      lat: stop.latitude,
      lng: stop.longitude,
      name: stop.customerName,
      type: 'customer' as const,
      info: `Order: ${stop.orderNumber}<br>Weight: ${stop.weight.toLocaleString()} kg`
    })),
    destination: routeData.stops[routeData.stops.length - 1] 
      ? {
          lat: routeData.stops[routeData.stops.length - 1].latitude,
          lng: routeData.stops[routeData.stops.length - 1].longitude,
          name: routeData.stops[routeData.stops.length - 1].customerName,
          type: 'customer' as const
        }
      : {
          lat: routeData.warehouse.latitude,
          lng: routeData.warehouse.longitude,
          name: routeData.warehouse.name,
          type: 'warehouse' as const
        }
  }];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Route - {routeData.shipmentNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ShipmentMap routes={mapRoutes} vehicles={vehicleLocations} />
        </div>
        <div className="mt-4">
          <h3 className="font-medium mb-2">Route Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Origin</p>
              <p>{routeData.warehouse.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Destination</p>
              <p>{routeData.stops[routeData.stops.length - 1]?.customerName || routeData.warehouse.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Distance</p>
              <p>{routeData.totalDistance.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Travel Time</p>
              <p>{Math.floor(routeData.estimatedTravelTime / 60)} hr {routeData.estimatedTravelTime % 60} min</p>
            </div>
          </div>
          
          <h3 className="font-medium mt-4 mb-2">Stops ({routeData.stops.length})</h3>
          <ul className="space-y-2">
            {routeData.stops.map((stop: any, index: number) => (
              <li key={index} className="border rounded p-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">{index + 1}. {stop.customerName}</div>
                  <div className="text-sm text-gray-500">{stop.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{stop.estimatedArrival}</div>
                  <div className="text-sm text-gray-500">{stop.orderNumber}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentRouteViewer;
