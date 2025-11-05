import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log full error (always log in production for debugging)
    console.error('❌ Exception caught:', exception);
    if (exception instanceof Error) {
      console.error('❌ Error message:', exception.message);
      console.error('❌ Stack trace:', exception.stack);
    }

    // Don't expose raw database errors
    const errorResponse =
      typeof message === 'string'
        ? { statusCode: status, message, timestamp: new Date().toISOString(), path: request.url }
        : {
            ...message,
            timestamp: new Date().toISOString(),
            path: request.url,
          };

    response.status(status).json(errorResponse);
  }
}

