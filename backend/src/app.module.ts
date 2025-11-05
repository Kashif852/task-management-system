import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsModule } from './events/events.module';
import { User } from './users/entities/user.entity';
import { Task } from './tasks/entities/task.entity';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
      // In production (Railway), env vars come from process.env directly
      // In development, use .env file
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Try multiple ways to get DATABASE_URL
        const databaseUrl = configService.get('DATABASE_URL') || process.env.DATABASE_URL;
        const isProduction = configService.get('NODE_ENV') === 'production' || process.env.NODE_ENV === 'production';

        console.log('Database configuration check:');
        console.log('DATABASE_URL from configService:', !!configService.get('DATABASE_URL'));
        console.log('DATABASE_URL from process.env:', !!process.env.DATABASE_URL);
        console.log('DATABASE_URL exists:', !!databaseUrl);
        console.log('All DATABASE_* env vars:', {
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          DATABASE_PUBLIC_URL: process.env.DATABASE_PUBLIC_URL ? 'SET' : 'NOT SET',
        });
        if (databaseUrl) {
          // Hide password in logs
          const safeUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
          console.log('DATABASE_URL:', safeUrl);
        } else {
          console.error('❌ DATABASE_URL is not set! Check Railway environment variables.');
        }

        // Support both DATABASE_URL (Railway format) and individual env vars
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            entities: [User, Task],
            synchronize: !isProduction, // IMPORTANT: false in production
            logging: configService.get('NODE_ENV') === 'development',
          };
        }

        // Fallback to individual environment variables
        const host = configService.get('POSTGRES_HOST') || process.env.POSTGRES_HOST || 'localhost';
        const port = configService.get('POSTGRES_PORT') || process.env.POSTGRES_PORT || 5432;
        const username = configService.get('POSTGRES_USER') || process.env.POSTGRES_USER || 'postgres';
        const password = configService.get('POSTGRES_PASSWORD') || process.env.POSTGRES_PASSWORD || 'postgres';
        const database = configService.get('POSTGRES_DB') || process.env.POSTGRES_DB || 'taskdb';
        
        console.log('Using individual PostgreSQL config (fallback)');
        console.log('Host:', host);
        console.log('Port:', port);
        console.log('Database:', database);
        
        return {
          type: 'postgres',
          host,
          port: typeof port === 'string' ? parseInt(port, 10) : port,
          username,
          password,
          database,
          entities: [User, Task],
          synchronize: !isProduction,
          logging: configService.get('NODE_ENV') === 'development' || process.env.NODE_ENV === 'development',
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoUri = configService.get('MONGODB_URI') || process.env.MONGODB_URI || 'mongodb://localhost:27017/tasklogs';
        console.log('MongoDB URI configured:', mongoUri ? 'SET' : 'NOT SET');
        return {
          uri: mongoUri,
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 minutes in milliseconds
      max: 100, // maximum number of items in cache
    }),
    AuthModule,
    UsersModule,
    TasksModule,
    EventsModule,
  ],
})
export class AppModule {}

