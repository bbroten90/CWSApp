// src/components/ShipmentMap.tsx
import React, { useEffect, useRef, useState } from 'react';

interface Location {
  lat: number;
  lng: number;
  name: string;
  type: 'warehouse' | 'customer' | 'vehicle';
  info?: string;
}

interface RouteInfo {
  origin: Location;
  stops: Location[];
  destination: Location;
}

interface ShipmentMapProps {
  routes: RouteInfo[];
  vehicles?: { id: string; lat: number; lng: number; info: string }[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

const ShipmentMap: React.FC<ShipmentMapProps> = ({
  routes,
  vehicles = [],
  center = { lat: 52.9399, lng: -106.4509 }, // Default center at Saskatchewan
  zoom = 6
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
    
    // Load Google Maps API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,routes`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = (err) => {
      console.error('Error loading Google Maps API:', err);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Clean up script if component unmounts during loading
      document.head.removeChild(script);
    };
  }, []);

  // Initialize map when API is loaded and div is available
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google) return;

    const mapOptions: google.maps.MapOptions = {
      center,
      zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    googleMapRef.current = new google.maps.Map(mapRef.current, mapOptions);
  }, [mapLoaded, center, zoom]);

  // Render routes when map is ready and routes data changes
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !window.google) return;

    const map = googleMapRef.current;
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderers: google.maps.DirectionsRenderer[] = [];
    const infoWindows: google.maps.InfoWindow[] = [];
    const markers: google.maps.Marker[] = [];

    // Clear previous routes and markers
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    infoWindows.forEach(window => window.close());
    markers.forEach(marker => marker.setMap(null));

    // Create a bounds object to fit all markers
    const bounds = new google.maps.LatLngBounds();

    // Add warehouse markers with a different icon
    routes.forEach((route, routeIndex) => {
      // Use different colors for each route
      const routeColors = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC'];
      const routeColor = routeColors[routeIndex % routeColors.length];

      // Add warehouse marker
      const warehouseMarker = new google.maps.Marker({
        position: { lat: route.origin.lat, lng: route.origin.lng },
        map,
        title: route.origin.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF'
        },
        zIndex: 10
      });
      
      markers.push(warehouseMarker);
      bounds.extend(warehouseMarker.getPosition()!);

      const warehouseInfo = new google.maps.InfoWindow({
        content: `<div><strong>${route.origin.name}</strong><p>Warehouse</p></div>`
      });
      
      warehouseMarker.addListener('click', () => {
        infoWindows.forEach(window => window.close());
        warehouseInfo.open(map, warehouseMarker);
      });
      
      infoWindows.push(warehouseInfo);

      // Add customer location markers
      route.stops.forEach((stop, index) => {
        const customerMarker = new google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          title: stop.name,
          label: {
            text: (index + 1).toString(),
            color: 'white'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: routeColor,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
          },
          zIndex: 5
        });
        
        markers.push(customerMarker);
        bounds.extend(customerMarker.getPosition()!);

        const customerInfo = new google.maps.InfoWindow({
          content: `<div><strong>${stop.name}</strong><p>Stop #${index + 1}</p><p>${stop.info || ''}</p></div>`
        });
        
        customerMarker.addListener('click', () => {
          infoWindows.forEach(window => window.close());
          customerInfo.open(map, customerMarker);
        });
        
        infoWindows.push(customerInfo);
      });

      // Create waypoints for the route
      const waypoints = route.stops.map(stop => ({
        location: new google.maps.LatLng(stop.lat, stop.lng),
        stopover: true
      }));

      // Request directions from Google
      directionsService.route({
        origin: new google.maps.LatLng(route.origin.lat, route.origin.lng),
        destination: new google.maps.LatLng(route.stops[route.stops.length - 1].lat, route.stops[route.stops.length - 1].lng),
        waypoints: waypoints.slice(0, -1), // All but the last stop, which is the destination
        optimizeWaypoints: false, // We're assuming the order is already optimized
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            directions: result,
            suppressMarkers: true, // We're adding our own markers
            polylineOptions: {
              strokeColor: routeColor,
              strokeWeight: 5,
              strokeOpacity: 0.7
            }
          });
          
          directionsRenderers.push(directionsRenderer);
        } else {
          console.error(`Error getting directions for route ${routeIndex}:`, status);
        }
      });
    });

    // Add vehicle location markers
    vehicles.forEach(vehicle => {
      const vehicleMarker = new google.maps.Marker({
        position: { lat: vehicle.lat, lng: vehicle.lng },
        map,
        title: `Vehicle ${vehicle.id}`,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#000000',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          rotation: 0 // You can calculate this based on heading if available
        },
        zIndex: 15
      });
      
      markers.push(vehicleMarker);
      bounds.extend(vehicleMarker.getPosition()!);

      const vehicleInfo = new google.maps.InfoWindow({
        content: `<div><strong>Vehicle ${vehicle.id}</strong><p>${vehicle.info}</p></div>`
      });
      
      vehicleMarker.addListener('click', () => {
        infoWindows.forEach(window => window.close());
        vehicleInfo.open(map, vehicleMarker);
      });
      
      infoWindows.push(vehicleInfo);
    });

    // Fit the map to show all markers
    if (markers.length > 0) {
      map.fitBounds(bounds);
      
      // Adjust zoom if too close
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 16) {
          map.setZoom(16);
        }
        google.maps.event.removeListener(listener);
      });
    }

    // Clean up function
    return () => {
      directionsRenderers.forEach(renderer => renderer.setMap(null));
      infoWindows.forEach(window => window.close());
      markers.forEach(marker => marker.setMap(null));
    };
  }, [routes, vehicles, mapLoaded]);

  return (
    <div className="w-full h-full">
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
    </div>
  );
};

export default ShipmentMap;
