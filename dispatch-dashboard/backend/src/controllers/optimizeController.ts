// src/controllers/optimizeController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import pool, { query } from '../config/database';
import { logger } from '../utils/logger';
import { spawn } from 'child_process';
import path from 'path';

interface OptimizationRequest {
  warehouseId: string;
  date: string;
  vehicleId?: string;
  driverId?: string;
  orderIds?: string[];
  maxStops?: number;
  returnToDepot?: boolean;
  priorityCustomers?: string[];
}

interface LatLng {
  lat: number;
  lng: number;
}

interface OrderForOptimization {
  id: string;
  order_number: string;
  delivery_address: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal_code: string;
  total_weight: number;
  pallets: number;
  customer_id: string;
  customer_name: string;
  priority: boolean;
  location?: LatLng;
}

interface VehicleForOptimization {
  id: string;
  vehicle_number: string;
  capacity_weight: number;
  capacity_pallets: number;
  type: string;
  make: string;
  model: string;
}

interface WarehouseLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  location: LatLng;
}

interface OptimizedLoad {
  vehicleId: string;
  orders: OrderForOptimization[];
  route: LatLng[];
  totalWeight: number;
  totalPallets: number;
  totalDistance: number; // in kilometers
  estimatedTime: number; // in minutes
  efficiencyScore: number; // 0-100
}

/**
 * Generate suggested loads using order optimization
 */
export const optimizeLoads = async (req: Request, res: Response): Promise<void> => {
  const { warehouseId, date, vehicleId, driverId, orderIds, maxStops, returnToDepot, priorityCustomers } = req.body as OptimizationRequest;
  
  if (!warehouseId) {
    res.status(400).json({ error: 'Warehouse ID is required' });
    return;
  }
  
  if (!date) {
    res.status(400).json({ error: 'Date is required' });
    return;
  }
  
  const optimizationId = uuidv4();
  const startTime = Date.now();
  
  try {
    // Log start of optimization
    await pool.query(
      `INSERT INTO optimization_logs
       (log_id, optimization_type, input_parameters, created_at)
       VALUES ($1, $2, $3, $4)`,
      [optimizationId, 'LOAD_OPTIMIZATION', JSON.stringify(req.body), new Date()]
    );
    
    // Get warehouse location
    const warehouseResult = await query(
      `SELECT id, name, address, city, province, postal_code, latitude, longitude
       FROM warehouses
       WHERE id = $1`,
      [warehouseId]
    );
    
    if (warehouseResult.rows.length === 0) {
      res.status(404).json({ error: 'Warehouse not found' });
      return;
    }
    
    const warehouse = warehouseResult.rows[0];
    const warehouseLocation: WarehouseLocation = {
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      province: warehouse.province,
      postal_code: warehouse.postal_code,
      location: {
        lat: parseFloat(warehouse.latitude),
        lng: parseFloat(warehouse.longitude)
      }
    };
    
    // Get available vehicles
    let vehiclesQuery = `
      SELECT id, vehicle_number, type, make, model, capacity_weight, capacity_pallets
      FROM vehicles
      WHERE status = 'active'
    `;
    const queryParams: any[] = [];
    
    if (vehicleId) {
      vehiclesQuery += ' AND id = $1';
      queryParams.push(vehicleId);
    } else {
      vehiclesQuery += ' AND home_warehouse_id = $1';
      queryParams.push(warehouseId);
    }
    
    const vehiclesResult = await query(vehiclesQuery, queryParams);
    const vehicles: VehicleForOptimization[] = vehiclesResult.rows;
    
    // Get pending orders for the date
    let ordersQuery = `
      SELECT o.id, o.order_number, o.delivery_address, o.delivery_city, o.delivery_province, 
             o.delivery_postal_code, o.total_weight, o.pallets, o.customer_id, 
             c.company_name as customer_name,
             o.pickup_date, o.delivery_date, o.special_instructions,
             c.latitude as customer_lat, c.longitude as customer_lng
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status = 'pending'
        AND o.pickup_date = $1
        AND o.pickup_warehouse_id = $2`;
    
    const ordersParams = [date, warehouseId];
    
    // If specific order IDs were provided, filter by them
    if (orderIds && orderIds.length > 0) {
      ordersQuery += ` AND o.id = ANY($3::uuid[])`;
      ordersParams.push(orderIds as any);
    }

    // Add sorting
    ordersQuery += ` ORDER BY c.priority DESC, o.total_weight DESC`;
    
    const ordersResult = await query(ordersQuery, ordersParams);
    
    // No orders to process
    if (ordersResult.rows.length === 0) {
      res.status(404).json({ error: 'No pending orders found for the selected date and warehouse' });
      return;
    }
    
    // Map orders to our optimization interface
    const orders: OrderForOptimization[] = ordersResult.rows.map(order => ({
      id: order.id,
      order_number: order.order_number,
      delivery_address: order.delivery_address,
      delivery_city: order.delivery_city,
      delivery_province: order.delivery_province,
      delivery_postal_code: order.delivery_postal_code,
      total_weight: parseFloat(order.total_weight),
      pallets: parseInt(order.pallets),
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      priority: priorityCustomers ? priorityCustomers.includes(order.customer_id) : false,
      location: order.customer_lat && order.customer_lng ? {
        lat: parseFloat(order.customer_lat),
        lng: parseFloat(order.customer_lng)
      } : undefined
    }));
    
    // Get locations for orders that have location data
    const validOrderLocations = orders
      .map(o => o.location)
      .filter((loc): loc is LatLng => loc !== undefined);
      
    // Calculate distance matrix
    const distanceMatrix = await createDistanceMatrix(
      [warehouseLocation.location, ...validOrderLocations],
      [warehouseLocation.location, ...validOrderLocations],
      process.env.GOOGLE_MAPS_API_KEY || ''
    );
    
    // Prepare data for the optimizer
    const optimizerData = {
      warehouse: warehouseLocation,
      vehicles: vehicles,
      orders: orders,
      distanceMatrix: distanceMatrix,
      maxStops: maxStops || 10,
      returnToDepot: returnToDepot !== false // Default to true
    };
    
    // Call the Python optimizer
    try {
      const optimizedLoads = await runOptimizationWithDistanceMatrix(optimizerData);
      
      // Update optimization record with success
      await pool.query(
        `UPDATE optimization_logs
         SET completed_at = $1,
             duration_ms = $2,
             output = $3,
             status = $4
         WHERE log_id = $5`,
        [
          new Date(),
          Date.now() - startTime,
          JSON.stringify({ suggestedLoads: optimizedLoads }),
          'SUCCESS',
          optimizationId
        ]
      );
      
      res.status(200).json({
        suggestedLoads: optimizedLoads
      });
    } catch (err) {
      // Log optimization error
      await pool.query(
        `UPDATE optimization_logs
         SET completed_at = $1,
             duration_ms = $2,
             error_message = $3,
             status = $4
         WHERE log_id = $5`,
        [
          new Date(),
          Date.now() - startTime,
          err instanceof Error ? err.message : String(err),
          'ERROR',
          optimizationId
        ]
      );
      
      res.status(500).json({
        error: 'Optimization failed',
        details: err instanceof Error ? err.message : String(err)
      });
    }
    
  } catch (err) {
    logger.error(`Error in optimize loads: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({
      error: 'Server error during optimization',
      details: err instanceof Error ? err.message : String(err)
    });
  }
};

/**
 * Create distance matrix between given locations
 */
async function createDistanceMatrix(
  origins: LatLng[], 
  destinations: LatLng[], 
  apiKey: string
): Promise<number[][]> {
  try {
    // Format locations for the API
    const formattedOrigins = origins.map(loc => ({
      latLng: { latitude: loc.lat, longitude: loc.lng }
    }));
    
    const formattedDestinations = destinations.map(loc => ({
      latLng: { latitude: loc.lat, longitude: loc.lng }
    }));
    
    // Call Google Maps Distance Matrix API
    const response = await axios.post(
      `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`,
      {
        origins: formattedOrigins,
        destinations: formattedDestinations,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters'
        }
      }
    );
    
    // Process the response into a matrix
    const matrix: number[][] = [];
    const size = origins.length;
    
    // Initialize matrix with zeros
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(0);
    }
    
    // Fill in the distances
    const responseData = response.data as Array<{
      originIndex: number;
      destinationIndex: number;
      distanceMeters: number;
    }>;
    
    responseData.forEach(element => {
      const originIndex = element.originIndex;
      const destIndex = element.destinationIndex;
      const distance = element.distanceMeters / 1000; // Convert to km
      
      matrix[originIndex][destIndex] = distance;
    });
    
    return matrix;
  } catch (error) {
    console.error('Error creating distance matrix:', error);
    
    // Fallback to a simple distance calculation
    return createSimpleDistanceMatrix(origins, destinations);
  }
}

/**
 * Fallback method to calculate distances when API fails
 */
function createSimpleDistanceMatrix(
  origins: LatLng[], 
  destinations: LatLng[]
): number[][] {
  const matrix: number[][] = [];
  
  for (let i = 0; i < origins.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < destinations.length; j++) {
      const origin = origins[i];
      const destination = destinations[j];
      
      // Calculate straight-line distance using Haversine formula
      const R = 6371; // Earth radius in km
      const dLat = (destination.lat - origin.lat) * Math.PI / 180;
      const dLon = (destination.lng - origin.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      matrix[i][j] = distance;
    }
  }
  
  return matrix;
}

interface OptimizerData {
  warehouse: WarehouseLocation;
  vehicles: VehicleForOptimization[];
  orders: OrderForOptimization[];
  distanceMatrix?: number[][];
  maxStops?: number;
  returnToDepot?: boolean;
}

/**
 * Send data to Python optimizer with distance matrix
 */
async function runOptimizationWithDistanceMatrix(data: OptimizerData): Promise<any> {
  // Create complete list of locations (warehouse + deliveries)
  const validLocations = data.orders
    .map(order => order.location)
    .filter((loc): loc is LatLng => loc !== undefined);
    
  const allLocations = [data.warehouse.location, ...validLocations];
  
  // Get distance matrix from Google Maps API
  const distanceMatrix = data.distanceMatrix || await createDistanceMatrix(
    allLocations, 
    allLocations,
    process.env.GOOGLE_MAPS_API_KEY || ''
  );
  
  // Add distance matrix to the data being sent to Python optimizer
  const enhancedData = {
    ...data,
    distanceMatrix
  };
  
  // Call Python script with enhanced data
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../scripts/load_optimizer.py'),
      '--json', JSON.stringify(enhancedData)
    ]);
    
    let resultData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorData}`));
      } else {
        try {
          resolve(JSON.parse(resultData));
        } catch (err) {
          reject(new Error(`Error parsing Python output: ${err instanceof Error ? err.message : String(err)}`));
        }
      }
    });
  });
}
