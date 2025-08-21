import { NextResponse } from 'next/server';
import { logger } from './logger';

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(404, `${resource} no encontrado`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'No autorizado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args);
      return NextResponse.json(result);
    } catch (error) {
      logger.error('API Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        args: args.length > 0 ? 'Request received' : 'No args'
      });
      
      if (error instanceof APIError) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: error.code,
            details: error.details 
          },
          { status: error.statusCode }
        );
      }
      
      // Error no manejado
      return NextResponse.json(
        { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}

export function handleAsyncError<T>(
  promise: Promise<T>
): Promise<[T | null, Error | null]> {
  return promise
    .then<[T, null]>((data: T) => [data, null])
    .catch<[null, Error]>((error: Error) => [null, error]);
}