import { Response } from 'express';

export interface AppError {
  statusCode: number;
  message: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

export function createError(statusCode: number, message: string, code?: string): AppError {
  const error: AppError = {
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };
  if (code) {
    error.code = code;
  }
  return error;
}

const isAppError = (error: unknown): error is AppError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error &&
    typeof (error as AppError).statusCode === 'number' &&
    typeof (error as AppError).message === 'string'
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (isAppError(error)) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};

export function logError(
  error: unknown,
  context: {
    userId?: string | number;
    profileId?: number;
    metric?: string;
    endpoint?: string;
  }
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    ...context,
    error: getErrorMessage(error),
  };

  console.error('Error', payload);
}

export function handleError(error: unknown, res: Response): void {
  const appError = isAppError(error) ? error : null;
  const statusCode = appError?.statusCode ?? 500;
  const responseMessage = appError
    ? appError.message
    : statusCode >= 500
      ? 'Internal server error'
      : getErrorMessage(error);

  const requestId = res.getHeader('x-request-id');
  const timestamp = appError?.timestamp ?? new Date().toISOString();

  const endpoint = res.req?.url ? `${res.req.method} ${res.req.url}` : undefined;
  logError(error, endpoint ? { endpoint } : {});

  const responseError: AppError = {
    statusCode,
    message: responseMessage,
    timestamp,
  };
  if (appError?.code) {
    responseError.code = appError.code;
  }
  if (requestId) {
    responseError.requestId = String(requestId);
  }

  res.status(statusCode).json({ error: responseError });
}
