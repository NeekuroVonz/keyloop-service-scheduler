import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../logging/request-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.header(REQUEST_ID_HEADER);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = HttpStatus[status] ?? error;
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const body = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };
        message = body.message ?? message;
        error = body.error ?? HttpStatus[status] ?? error;
      }

      // Never expose raw Error.message for unexpected 5xx HttpExceptions either.
      if (status >= 500) {
        message = 'Internal server error';
        error = 'Internal Server Error';
      }
    }

    if (status >= 500) {
      this.logger.error(
        {
          requestId,
          path: request.url,
          method: request.method,
          status,
          err:
            exception instanceof Error
              ? { name: exception.name, message: exception.message }
              : { message: 'Unknown error' },
        },
        'Unhandled exception',
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
