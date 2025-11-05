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
        const isProduction = configService.get('NODE_ENV') === 'production' || process.env.NODE_ENV === 'production';

        console.log('Database configuration check:');
        console.log('All available env vars:', Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('DATABASE')).join(', '));
        
        // Try multiple ways to get DATABASE_URL
        const databaseUrl = configService.get('DATABASE_URL') || process.env.DATABASE_URL;
        
        // Try to build DATABASE_URL from individual PostgreSQL variables (Railway provides these)
        const pgHost = configService.get('PGHOST') || process.env.PGHOST || 
                       configService.get('POSTGRES_HOST') || process.env.POSTGRES_HOST;
        const pgPort = configService.get('PGPORT') || process.env.PGPORT || 
                       configService.get('POSTGRES_PORT') || process.env.POSTGRES_PORT || '5432';
        const pgUser = configService.get('PGUSER') || process.env.PGUSER || 
                       configService.get('POSTGRES_USER') || process.env.POSTGRES_USER || 'postgres';
        const pgPassword = configService.get('PGPASSWORD') || process.env.PGPASSWORD || 
                           configService.get('POSTGRES_PASSWORD') || process.env.POSTGRES_PASSWORD;
        const pgDatabase = configService.get('PGDATABASE') || process.env.PGDATABASE || 
                           configService.get('POSTGRES_DB') || process.env.POSTGRES_DB || 'railway';

        console.log('DATABASE_URL from configService:', !!configService.get('DATABASE_URL'));
        console.log('DATABASE_URL from process.env:', !!process.env.DATABASE_URL);
        console.log('PostgreSQL individual vars:', {
          PGHOST: pgHost || 'NOT SET',
          PGPORT: pgPort || 'NOT SET',
          PGUSER: pgUser || 'NOT SET',
          PGPASSWORD: pgPassword ? 'SET' : 'NOT SET',
          PGDATABASE: pgDatabase || 'NOT SET',
        });

        // If DATABASE_URL exists, use it
        if (databaseUrl) {
          const safeUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
          console.log('✅ Using DATABASE_URL:', safeUrl);
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            entities: [User, Task],
            synchronize: !isProduction,
            logging: !isProduction,
          };
        }

        // If we have all individual PostgreSQL vars, build connection string or use individual config
        if (pgHost && pgUser && pgPassword && pgDatabase) {
          console.log('✅ Using individual PostgreSQL variables');
          console.log('Host:', pgHost);
          console.log('Port:', pgPort);
          console.log('Database:', pgDatabase);
          console.log('User:', pgUser);
          
          // Build connection URL from individual vars
          const builtUrl = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
          
          return {
            type: 'postgres',
            url: builtUrl,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            entities: [User, Task],
            synchronize: !isProduction,
            logging: !isProduction,
          };
        }

        // Final fallback to localhost
        console.warn('⚠️ Using localhost fallback - this will fail in production!');
        return {
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'taskdb',
          entities: [User, Task],
          synchronize: !isProduction,
          logging: !isProduction,
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

