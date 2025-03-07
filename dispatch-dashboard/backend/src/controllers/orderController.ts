// src/controllers/orderController.ts
import { Request, Response } from 'express';
import { 
  createOrder, 
  getOrders, 
  getOrderById, 
  updateOrder, 
  deleteOrder,
  getOrderWithShipmentDetails,
  OrderFilters
} from '../models/orderModel';
import { ApiError } from '../middleware/errorHandler';
import { validateOrder } from '../utils/validators';

// Get all orders
export const getAllOrders = async (req: Request, res: Response) => {
  const filters: OrderFilters = {};
  
  // Extract and validate query parameters
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.customer_id) filters.customer_id = req.query.customer_id as string;
  if (req.query.start_date) filters.start_date = new Date(req.query.start_date as string);
  if (req.query.end_date) filters.end_date = new Date(req.query.end_date as string);
  
  const orders = await getOrders(filters);
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
};

// Get a single order
export const getOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const order = await getOrderById(id);
  
  if (!order) {
    throw new ApiError('Order not found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
};

// Get order with shipment details
export const getOrderDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const orderDetails = await getOrderWithShipmentDetails(id);
  
  if (!orderDetails) {
    throw new ApiError('Order not found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      orderDetails,
    },
  });
};

// Create a new order
export const createNewOrder = async (req: Request, res: Response) => {
  // Validate order data
  const validation = validateOrder(req.body);
  if (!validation.valid) {
    throw new ApiError(validation.message || 'Invalid order data', 400);
  }
  
  const newOrder = await createOrder(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      order: newOrder,
    },
  });
};

// Update an order
export const updateExistingOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if order exists
  const existingOrder = await getOrderById(id);
  if (!existingOrder) {
    throw new ApiError('Order not found', 404);
  }
  
  // Validate update data (partial validation)
  // Only validate fields that are provided
  
  const updatedOrder = await updateOrder(id, req.body);
  
  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder,
    },
  });
};

// Delete an order
export const deleteExistingOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if order exists
  const existingOrder = await getOrderById(id);
  if (!existingOrder) {
    throw new ApiError('Order not found', 404);
  }
  
  await deleteOrder(id);
  
  res.status(204).json({
    status: 'success',
    data: null,
  });
};
