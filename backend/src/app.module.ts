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
      envFilePath: '.env',
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
        return {
          type: 'postgres',
          host: configService.get('POSTGRES_HOST') || 'localhost',
          port: configService.get('POSTGRES_PORT') || 5432,
          username: configService.get('POSTGRES_USER') || 'postgres',
          password: configService.get('POSTGRES_PASSWORD') || 'postgres',
          database: configService.get('POSTGRES_DB') || 'taskdb',
          entities: [User, Task],
          synchronize: !isProduction,
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get('MONGODB_URI') ||
          'mongodb://localhost:27017/tasklogs',
      }),
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

