// src/routes/orderRoutes.ts
import { Router } from 'express';
import { 
  getAllOrders, 
  getOrder, 
  createNewOrder, 
  updateExistingOrder, 
  deleteExistingOrder,
  getOrderDetails
} from '../controllers/orderController';

const router = Router();

// Get all orders
router.get('/', getAllOrders);

// Get order details with shipment information
router.get('/:id/details', getOrderDetails);

// Get single order
router.get('/:id', getOrder);

// Create new order
router.post('/', createNewOrder);

// Update order
router.patch('/:id', updateExistingOrder);

// Delete order
router.delete('/:id', deleteExistingOrder);

export default router;
