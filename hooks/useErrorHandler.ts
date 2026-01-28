import { useCallback, useState } from 'react';

export interface AppError {
  message: string;
  code?: string;
  details?: string;
}

export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: unknown, defaultMessage = 'An unexpected error occurred') => {
    let errorMessage = defaultMessage;
    let errorCode: string | undefined;
    let errorDetails: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message || defaultMessage;
      errorCode = error.name;
      errorDetails = error.stack;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
      if ('code' in error) {
        errorCode = String(error.code);
      }
    }

    const appError: AppError = {
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
    };

    setError(appError);
    console.error('Error handled:', appError);
    
    return appError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: {
        onError?: (error: AppError) => void;
        onSuccess?: (result: T) => void;
        loadingState?: boolean;
        defaultErrorMessage?: string;
      }
    ): Promise<T | null> => {
      const { 
        onError, 
        onSuccess, 
        loadingState = false,
        defaultErrorMessage = 'An unexpected error occurred'
      } = options || {};

      try {
        if (loadingState) {
          setIsLoading(true);
        }
        clearError();
        
        const result = await asyncFn();
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        const appError = handleError(err, defaultErrorMessage);
        
        if (onError) {
          onError(appError);
        }
        
        return null;
      } finally {
        if (loadingState) {
          setIsLoading(false);
        }
      }
    },
    [handleError, clearError]
  );

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
    setLoading: setIsLoading,
  };
}
