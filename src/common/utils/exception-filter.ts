import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ServiceResponse } from '../model/service-respone';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchAllExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorData: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string' ? res : ((res as any).message ?? message);
      errorData = res;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorData =
        process.env.NODE_ENV === 'production' ? undefined : exception.stack;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[Exception]', exception);
    }

    httpAdapter.reply(
      response,
      ServiceResponse.failure(message, errorData, status),
      status,
    );
  }
}
