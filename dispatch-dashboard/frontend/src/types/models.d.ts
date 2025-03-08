// Common data models for the application

export interface Order {
  id: string;
  order_number: string;
  customer_name?: string;
  delivery_city: string;
  delivery_province: string;
  delivery_address?: string;
  delivery_postal_code?: string;
  pickup_date: string;
  delivery_date: string;
  total_weight: number;
  pallets: number;
  special_instructions?: string;
  status?: string;
  warehouse_name?: string;
  // Additional properties used in maps
  customer_lat?: string;
  customer_lng?: string;
}

export interface Warehouse {
  warehouse_id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  // Additional properties used in maps
  latitude?: string;
  longitude?: string;
}

export interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  capacity_weight: number;
  capacity_pallets: number;
  status?: string;
}

export interface Customer {
  customer_id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
}

export interface SuggestedLoad {
  orders: Order[];
  totalWeight: number;
  totalPallets: number;
  efficiencyScore: number;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  warehouse_name?: string;
  vehicle_number?: string | null;
  planned_date: string;
  status: 'planned' | 'in_transit' | 'completed' | 'cancelled';
  order_count?: number;
  total_weight: number;
  total_pallets: number;
  total_revenue: number;
  orders?: Order[];
}
