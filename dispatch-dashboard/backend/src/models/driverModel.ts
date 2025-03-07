// src/models/driverModel.ts
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: Date;
  status: 'active' | 'inactive' | 'on_leave';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDriverDto {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: Date;
  status: 'active' | 'inactive' | 'on_leave';
  notes?: string;
}

export interface UpdateDriverDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  license_number?: string;
  license_expiry?: Date;
  status?: 'active' | 'inactive' | 'on_leave';
  notes?: string;
}

export interface DriverFilters {
  status?: string;
  license_expiring_soon?: boolean;
  available?: boolean;
}

// Create a new driver
export const createDriver = async (driverData: CreateDriverDto): Promise<Driver> => {
  const id = uuidv4();
  const now = new Date();
  
  const result = await query(
    `INSERT INTO drivers (
      id, first_name, last_name, email, phone, 
      license_number, license_expiry, status, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
    RETURNING *`,
    [
      id, driverData.first_name, driverData.last_name, driverData.email, driverData.phone,
      driverData.license_number, driverData.license_expiry, driverData.status, 
      driverData.notes || null, now, now
    ]
  );
  
  return result.rows[0];
};

// Get all drivers with optional filters
export const getDrivers = async (filters?: DriverFilters): Promise<Driver[]> => {
  let queryText = 'SELECT * FROM drivers';
  const queryParams: any[] = [];
  
  if (filters) {
    const conditions: string[] = [];
    
    if (filters.status) {
      conditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(filters.status);
    }
    
    if (filters.license_expiring_soon) {
      // Licenses expiring in the next 30 days
      conditions.push(`license_expiry BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '30 days')`);
    }
    
    if (filters.available === true) {
      // This assumes a driver is available if active and not assigned to an active shipment
      conditions.push(`status = 'active' AND id NOT IN (
        SELECT driver_id FROM shipments
        WHERE status IN ('planned', 'in_transit')
      )`);
    }
    
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
  }
  
  queryText += ' ORDER BY last_name, first_name';
  
  const result = await query(queryText, queryParams);
  return result.rows;
};

// Get driver by ID
export const getDriverById = async (id: string): Promise<Driver | null> => {
  const result = await query('SELECT * FROM drivers WHERE id = $1', [id]);
  return result.rows.length ? result.rows[0] : null;
};

// Update driver
export const updateDriver = async (id: string, updateData: UpdateDriverDto): Promise<Driver | null> => {
  // Build dynamic query based on provided fields
  const updates: string[] = [];
  const queryParams: any[] = [id];
  
  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = $${queryParams.length + 1}`);
      queryParams.push(value);
    }
  });
  
  // Always update the updated_at timestamp
  updates.push(`updated_at = $${queryParams.length + 1}`);
  queryParams.push(new Date());
  
  if (updates.length === 0) {
    // No updates to make
    return getDriverById(id);
  }
  
  const queryText = `
    UPDATE drivers 
    SET ${updates.join(', ')} 
    WHERE id = $1 
    RETURNING *
  `;
  
  const result = await query(queryText, queryParams);
  return result.rows.length ? result.rows[0] : null;
};

// Delete driver
export const deleteDriver = async (id: string): Promise<boolean> => {
  const result = await query('DELETE FROM drivers WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

// Get driver with current assignment status
export const getDriverWithAssignmentStatus = async (id: string): Promise<any> => {
  const result = await query(`
    SELECT d.*, 
           s.id as current_shipment_id, 
           s.status as shipment_status,
           o.id as order_id,
           o.order_number,
           v.id as vehicle_id,
           v.vehicle_number
    FROM drivers d
    LEFT JOIN shipments s ON d.id = s.driver_id AND s.status IN ('planned', 'in_transit')
    LEFT JOIN orders o ON s.order_id = o.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    WHERE d.id = $1
  `, [id]);
  
  return result.rows.length ? result.rows[0] : null;
};

// Get driver shipment history
export const getDriverShipmentHistory = async (id: string, limit: number = 10): Promise<any[]> => {
  const result = await query(`
    SELECT 
      s.id, s.planned_departure, s.planned_arrival, 
      s.actual_departure, s.actual_arrival, s.status,
      o.order_number, o.pickup_city, o.pickup_province, o.delivery_city, o.delivery_province,
      v.vehicle_number
    FROM shipments s
    JOIN orders o ON s.order_id = o.id
    JOIN vehicles v ON s.vehicle_id = v.id
    WHERE s.driver_id = $1
    ORDER BY s.planned_departure DESC
    LIMIT $2
  `, [id, limit]);
  
  return result.rows;
};

// Get driver performance metrics
export const getDriverPerformanceMetrics = async (id: string, startDate?: Date, endDate?: Date): Promise<any> => {
  // Default to last 30 days if no dates provided
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const start = startDate || thirtyDaysAgo;
  const end = endDate || today;
  
  const result = await query(`
    SELECT 
      COUNT(s.id) as total_shipments,
      SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_shipments,
      SUM(CASE WHEN s.actual_arrival <= s.planned_arrival THEN 1 ELSE 0 END) as on_time_deliveries,
      ROUND(
        SUM(CASE WHEN s.actual_arrival <= s.planned_arrival THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(s.id)::numeric, 0) * 100, 
        2
      ) as on_time_percentage,
      ROUND(
        AVG(EXTRACT(EPOCH FROM (s.actual_arrival - s.actual_departure))/3600),
        2
      ) as avg_delivery_time_hours,
      SUM(s.distance_miles) as total_distance_miles,
      COUNT(DISTINCT o.customer_id) as unique_customers_served
    FROM shipments s
    JOIN orders o ON s.order_id = o.id
    WHERE s.driver_id = $1
      AND s.planned_departure >= $2
      AND s.planned_departure <= $3
  `, [id, start, end]);
  
  return result.rows[0];
};

// Get drivers with licenses expiring soon
export const getDriversWithExpiringLicenses = async (days: number = 30): Promise<Driver[]> => {
  const result = await query(`
    SELECT * FROM drivers
    WHERE license_expiry BETWEEN CURRENT_DATE AND (CURRENT_DATE + interval '${days} days')
    ORDER BY license_expiry
  `);
  
  return result.rows;
};
