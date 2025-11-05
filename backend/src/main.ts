import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  try {
    console.log('Starting application...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('PORT:', process.env.PORT || 3001);
    
    const app = await NestFactory.create(AppModule);

    // Enable CORS for frontend
    app.enableCors({
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
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

