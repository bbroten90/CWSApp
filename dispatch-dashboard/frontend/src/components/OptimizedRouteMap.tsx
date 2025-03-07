// Enhanced version of your ShipmentMap component with route optimization
// This adds actual route paths between stops using Google Maps Directions API

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui';
import { Truck, RefreshCw } from 'lucide-react';

// This component enhances your existing ShipmentMap by adding actual route paths
const OptimizedRouteMap = ({ shipment, warehouse, orders }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeDetails, setRouteDetails] = useState({
    totalDistance: 0,
    totalDuration: 0,
    waypoints: []
  });

  // Initialize Google Map
  useEffect(() => {
    if (!window.google || !mapRef.current) return;

    const newMap = new window.google.maps.Map(mapRef.current, {
      center: { 
        lat: warehouse?.latitude || 52.9399, 
        lng: warehouse?.longitude || -106.4509 
      },
      zoom: 7,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true
    });

    const renderer = new window.google.maps.DirectionsRenderer({
      map: newMap,
      suppressMarkers: true, // We'll add our own custom markers
    });

    setMap(newMap);
    setDirectionsRenderer(renderer);
  }, [warehouse]);

  // Add markers for warehouse and orders
  useEffect(() => {
    if (!map || !warehouse) return;

    // Clear any existing markers
    map.data.forEach(feature => {
      map.data.remove(feature);
    });

    // Add warehouse marker
    if (warehouse?.latitude && warehouse?.longitude) {
      const warehouseMarker = new window.google.maps.Marker({
        position: { 
          lat: parseFloat(warehouse.latitude), 
          lng: parseFloat(warehouse.longitude) 
        },
        map: map,
        title: warehouse.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF'
        },
        zIndex: 10
      });

      // Add info window for warehouse
      const warehouseInfo = new window.google.maps.InfoWindow({
        content: `<div><strong>${warehouse.name}</strong><p>Warehouse</p></div>`
      });

      warehouseMarker.addListener('click', () => {
        warehouseInfo.open(map, warehouseMarker);
      });
    }

    // Add markers for each order location
    if (orders && orders.length > 0) {
      orders.forEach((order, index) => {
        if (order.customer_lat && order.customer_lng) {
          const orderMarker = new window.google.maps.Marker({
            position: { 
              lat: parseFloat(order.customer_lat), 
              lng: parseFloat(order.customer_lng) 
            },
            map: map,
            title: order.customer_name,
            label: {
              text: (index + 1).toString(),
              color: 'white'
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#DB4437',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            },
            zIndex: 5
          });

          // Add info window for order
          const orderInfo = new window.google.maps.InfoWindow({
            content: `
              <div>
                <strong>${order.customer_name || 'Customer'}</strong>
                <p>Order #: ${order.order_number}</p>
                <p>${order.delivery_city}, ${order.delivery_province}</p>
              </div>
            `
          });

          orderMarker.addListener('click', () => {
            orderInfo.open(map, orderMarker);
          });
        }
      });
    }
  }, [map, warehouse, orders]);

  // Function to optimize and display route
  const optimizeAndDisplayRoute = async () => {
    if (!map || !directionsRenderer || !warehouse || !orders || orders.length === 0) return;

    setIsOptimizing(true);

    try {
      // Get coordinates for warehouse and orders
      const warehouseLocation = {
        lat: parseFloat(warehouse.latitude),
        lng: parseFloat(warehouse.longitude)
      };

      // Filter orders that have valid coordinates
      const validOrders = orders.filter(order => 
        order.customer_lat && order.customer_lng
      );

      if (validOrders.length === 0) {
        console.error("No valid order locations found");
        setIsOptimizing(false);
        return;
      }

      // Create an array of locations (origin, destinations)
      const directionsService = new window.google.maps.DirectionsService();

      // Create waypoints for all orders
      const waypoints = validOrders.map(order => ({
        location: new window.google.maps.LatLng(
          parseFloat(order.customer_lat),
          parseFloat(order.customer_lng)
        ),
        stopover: true
      }));

      // Get the optimized route from Google Maps Directions API
      const result = await new Promise((resolve, reject) => {
        directionsService.route({
          origin: warehouseLocation,
          destination: warehouseLocation, // Return to warehouse
          waypoints: waypoints,
          optimizeWaypoints: true, // This is the key feature - Google will optimize the route
          travelMode: window.google.maps.TravelMode.DRIVING,
        }, (response, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            resolve(response);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        });
      });

      // Display the route
      directionsRenderer.setDirections(result);

      // Calculate and store route details
      let totalDistance = 0;
      let totalDuration = 0;
      const optimizedWaypoints = [];

      // Process route data
      const route = result.routes[0];
      const legs = route.legs;

      legs.forEach((leg, i) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;

        // Add stops to optimized waypoints list
        if (i < legs.length - 1) { // Skip the last leg which returns to warehouse
          const waypointOrder = route.waypoint_order[i];
          const orderIndex = validOrders[waypointOrder];
          
          optimizedWaypoints.push({
            orderNumber: orderIndex.order_number,
            customerName: orderIndex.customer_name,
            location: leg.end_location,
            distance: leg.distance.text,
            duration: leg.duration.text
          });
        }
      });

      // Update route details
      setRouteDetails({
        totalDistance: totalDistance / 1000, // Convert to kilometers
        totalDuration: totalDuration / 60, // Convert to minutes
        waypoints: optimizedWaypoints
      });

    } catch (error) {
      console.error("Error optimizing route:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Shipment Route</h3>
        <Button 
          size="sm" 
          onClick={optimizeAndDisplayRoute}
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Truck className="h-4 w-4 mr-2" />
          )}
          {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
        </Button>
      </div>

      {/* Map container */}
      <div className="flex-1" style={{ minHeight: '400px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Route details */}
      {routeDetails.totalDistance > 0 && (
        <div className="mt-4 bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between mb-2">
            <h4 className="font-medium">Optimized Route</h4>
            <div className="text-sm text-gray-500">
              {routeDetails.totalDistance.toFixed(1)} km • 
              {routeDetails.totalDuration > 60 
                ? ` ${Math.floor(routeDetails.totalDuration / 60)} hr ${Math.round(routeDetails.totalDuration % 60)} min` 
                : ` ${Math.round(routeDetails.totalDuration)} min`}
            </div>
          </div>
          <div className="text-sm">
            <div className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                S
              </div>
              <span>{warehouse.name}</span>
            </div>
            
            {routeDetails.waypoints.map((waypoint, index) => (
              <div key={index} className="flex items-center mt-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs mr-2">
                  {index + 1}
                </div>
                <span>{waypoint.customerName} - {waypoint.orderNumber}</span>
                <span className="ml-auto text-gray-500">{waypoint.distance}</span>
              </div>
            ))}
            
            <div className="flex items-center mt-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                E
              </div>
              <span>{warehouse.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedRouteMap;
