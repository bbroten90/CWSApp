// src/models/orderModel.ts
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  pickup_address: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal_code: string;
  pickup_date: Date;
  delivery_address: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal_code: string;
  delivery_date: Date;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  total_weight: number;
  total_volume: number;
  special_instructions?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderDto {
  order_number: string;
  customer_id: string;
  pickup_address: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal_code: string;
  pickup_date: Date;
  delivery_address: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal_code: string;
  delivery_date: Date;
  total_weight: number;
  total_volume: number;
  special_instructions?: string;
}

export interface UpdateOrderDto {
  status?: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  pickup_date?: Date;
  delivery_date?: Date;
  special_instructions?: string;
}

export interface OrderFilters {
  status?: string;
  customer_id?: string;
  start_date?: Date;
  end_date?: Date;
}

// Create a new order
export const createOrder = async (orderData: CreateOrderDto): Promise<Order> => {
  const id = uuidv4();
  const now = new Date();
  
  const result = await query(
    `INSERT INTO order_headers (
      id, order_number, customer_id, 
      pickup_address, pickup_city, pickup_province, pickup_postal_code, pickup_date,
      delivery_address, delivery_city, delivery_province, delivery_postal_code, delivery_date,
      status, total_weight, total_volume, special_instructions, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
    RETURNING *`,
    [
      id, orderData.order_number, orderData.customer_id,
      orderData.pickup_address, orderData.pickup_city, orderData.pickup_province, orderData.pickup_postal_code, orderData.pickup_date,
      orderData.delivery_address, orderData.delivery_city, orderData.delivery_province, orderData.delivery_postal_code, orderData.delivery_date,
      'pending', orderData.total_weight, orderData.total_volume, orderData.special_instructions || null, now, now
    ]
  );
  
  return result.rows[0];
};

// Get all orders with optional filters
export const getOrders = async (filters?: OrderFilters): Promise<Order[]> => {
  let queryText = 'SELECT * FROM order_headers';
  const queryParams: any[] = [];
  
  if (filters) {
    const conditions: string[] = [];
    
    if (filters.status) {
      conditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(filters.status);
    }
    
    if (filters.customer_id) {
      conditions.push(`customer_id = $${queryParams.length + 1}`);
      queryParams.push(filters.customer_id);
    }
    
    if (filters.start_date) {
      conditions.push(`pickup_date >= $${queryParams.length + 1}`);
      queryParams.push(filters.start_date);
    }
    
    if (filters.end_date) {
      conditions.push(`pickup_date <= $${queryParams.length + 1}`);
      queryParams.push(filters.end_date);
    }
    
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
  }
  
  queryText += ' ORDER BY created_at DESC';
  
  const result = await query(queryText, queryParams);
  return result.rows;
};

// Get order by ID
export const getOrderById = async (id: string): Promise<Order | null> => {
  const result = await query('SELECT * FROM order_headers WHERE id = $1', [id]);
  return result.rows.length ? result.rows[0] : null;
};

// Update order
export const updateOrder = async (id: string, updateData: UpdateOrderDto): Promise<Order | null> => {
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
    return getOrderById(id);
  }
  
  const queryText = `
    UPDATE order_headers 
    SET ${updates.join(', ')} 
    WHERE id = $1 
    RETURNING *
  `;
  
  const result = await query(queryText, queryParams);
  return result.rows.length ? result.rows[0] : null;
};

// Delete order
export const deleteOrder = async (id: string): Promise<boolean> => {
  const result = await query('DELETE FROM order_headers WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

// Get order with shipment details
export const getOrderWithShipmentDetails = async (id: string): Promise<any> => {
  const result = await query(`
    SELECT o.*, 
           s.id as shipment_id, 
           s.status as shipment_status,
           v.id as vehicle_id, 
           v.vehicle_number,
           d.id as driver_id,
           d.first_name as driver_first_name,
           d.last_name as driver_last_name
    FROM order_headers o
    LEFT JOIN shipments s ON o.id = s.order_id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    LEFT JOIN drivers d ON s.driver_id = d.id
    WHERE o.id = $1
  `, [id]);
  
  return result.rows.length ? result.rows[0] : null;
};
