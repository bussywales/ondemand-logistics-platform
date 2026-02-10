import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Logger } from "pino";
import { getRequestContext } from "@shipwright/observability";
import type { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { actorId?: string }>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException
      ? exception.getResponse()
      : {
          message: "internal_server_error"
        };

    const requestContext = getRequestContext();

    this.logger.error(
      {
        request_id: requestContext?.requestId,
        actor_id: request.actorId,
        method: request.method,
        path: request.url,
        status_code: statusCode,
        err: exception
      },
      "request_failed"
    );

    response.status(statusCode).json({
      error: body,
      request_id: requestContext?.requestId
    });
  }
}
