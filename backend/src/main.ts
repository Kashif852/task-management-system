import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  try {
    console.log('Starting application...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('PORT:', process.env.PORT || 3001);
    
    const app = await NestFactory.create(AppModule);

    // Enable CORS for frontend
    const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('CORS Origin configured:', corsOrigin);
    console.log('All CORS-related env vars:', {
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      FRONTEND_URL: process.env.FRONTEND_URL,
    });
    
    // Support multiple origins (comma-separated) or single origin
    const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());
    
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          console.log('CORS: Allowing request with no origin');
          return callback(null, true);
        }
        
        console.log('CORS: Checking origin:', origin);
        
        // Check if origin is in allowed list (exact match)
        if (allowedOrigins.includes(origin)) {
          console.log('CORS: Allowed (exact match)');
          return callback(null, true);
        }
        
        // Also allow if origin matches without trailing slash
        const normalizedOrigin = origin.replace(/\/$/, '');
        const normalizedAllowed = allowedOrigins.map(o => o.replace(/\/$/, ''));
        
        if (normalizedAllowed.includes(normalizedOrigin)) {
          console.log('CORS: Allowed (normalized match)');
          return callback(null, true);
        }
        
        console.warn('CORS: BLOCKED origin:', origin);
        console.warn('CORS: Allowed origins:', allowedOrigins);
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Type', 'Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Add request logging middleware to debug CORS
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${req.method}] ${req.path} - Origin: ${req.headers.origin || 'none'}`);
      console.log('Request headers:', {
        origin: req.headers.origin,
        'access-control-request-method': req.headers['access-control-request-method'],
        'access-control-request-headers': req.headers['access-control-request-headers'],
      });
      next();
    });

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`✅ Application is running on: http://0.0.0.0:${port}`);
    console.log(`✅ Health check available at: http://0.0.0.0:${port}/health`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}
bootstrap().catch((error) => {
  console.error('❌ Bootstrap error:', error);
  process.exit(1);
});

