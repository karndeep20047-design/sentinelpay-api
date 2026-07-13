import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/swagger.config';
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import transactionRoutes from './routes/transaction.routes';
import mpesaRoutes from './routes/mpesa.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import { ApiResponse } from './utils/ApiResponse';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// Enable CORS
app.use(cors());

// Body parsing
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SentinelPay API Docs',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Health check
app.get('/health', (_req, res) => {
  return ApiResponse.success(res, 'SentinelPay API is running', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler (must be last)
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🛡️  SentinelPay API running on port ${PORT}`);
    console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
  });
}

export default app;
