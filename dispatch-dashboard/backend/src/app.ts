// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import orderRoutes from './routes/orderRoutes';
import shipmentRoutes from './routes/shipmentRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import driverRoutes from './routes/driverRoutes';
import rateRoutes from './routes/rateRoutes';
import reportRoutes from './routes/reportRoutes';
import optimizeRoutes from './routes/optimizeRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Routes
app.use('/api/orders', orderRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/optimize', optimizeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler as express.ErrorRequestHandler);

export default app;
