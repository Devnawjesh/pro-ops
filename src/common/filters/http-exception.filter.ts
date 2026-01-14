import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;

    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const response = isHttp ? exception.getResponse() : null;

    // Nest sometimes returns string or object
    let message: any = 'Internal server error';
    let errorName = exception?.name ?? 'Error';

    if (typeof response === 'string') {
      message = response;
    } else if (response && typeof response === 'object') {
      // response can be { message: string | string[], error: string, statusCode: number }
      message = (response as any).message ?? exception.message;
      errorName = (response as any).error ?? errorName;
    } else if (exception?.message) {
      message = exception.message;
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: errorName,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
