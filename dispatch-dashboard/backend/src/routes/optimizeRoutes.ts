// src/routes/optimizeRoutes.ts
import { Router } from 'express';
import { optimizeLoads } from '../controllers/optimizeController';

const router = Router();

// Optimize loads route
router.post('/loads', optimizeLoads);

export default router;
