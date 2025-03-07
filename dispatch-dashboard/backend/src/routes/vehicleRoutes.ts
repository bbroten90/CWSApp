// src/routes/vehicleRoutes.ts
import { Router } from 'express';
import { 
  getAllVehicles, 
  getVehicle, 
  createNewVehicle, 
  updateExistingVehicle, 
  deleteExistingVehicle,
  getVehicleDetails,
  getVehicleStats,
  getMaintenanceDue
} from '../controllers/vehicleControllers';

const router = Router();

// Get all vehicles
router.get('/', getAllVehicles);

// Get vehicle statistics
router.get('/stats', getVehicleStats);

// Get vehicles due for maintenance
router.get('/maintenance-due', getMaintenanceDue);

// Get vehicle details with assignment information
router.get('/:id/details', getVehicleDetails);

// Get single vehicle
router.get('/:id', getVehicle);

// Create new vehicle
router.post('/', createNewVehicle);

// Update vehicle
router.patch('/:id', updateExistingVehicle);

// Delete vehicle
router.delete('/:id', deleteExistingVehicle);

export default router;
