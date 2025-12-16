/**
 * Error handling utilities
 */

export type AppError = {
  message: string;
  code?: string;
  isUserFriendly?: boolean;
};

/**
 * Create a user-friendly error message
 */
export function createErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  // Handle common "error-like" objects (e.g. our service-layer errors)
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as any).message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
  // In production, you might want to send to error tracking service
}

/**
 * Format error for display
 */
export function formatError(error: unknown, defaultMessage: string): string {
  const message = createErrorMessage(error, defaultMessage);
  logError(error, 'formatError');
  return message;
}

/**
 * Check if error is a known error type
 */
export function isKnownError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  );
}
