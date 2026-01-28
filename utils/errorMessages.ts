/**
 * Standardized error messages for the app
 */
export const ErrorMessages = {
  // Photo operations
  LOAD_PHOTOS_FAILED: 'Failed to load photos. Please try again.',
  SAVE_PHOTO_FAILED: 'Failed to save photo. Please check storage permissions.',
  DELETE_PHOTO_FAILED: 'Failed to delete photo. Please try again.',
  TAKE_PHOTO_FAILED: 'Failed to take photo. Please check camera permissions.',
  
  // File system
  FILE_SYSTEM_ERROR: 'File system error occurred.',
  PERMISSION_DENIED: 'Permission denied. Please grant the required permissions.',
  STORAGE_FULL: 'Storage is full. Please free up some space.',
  
  // Network (if applicable in future)
  NETWORK_ERROR: 'Network error. Please check your connection.',
  
  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

/**
 * Gets a user-friendly error message from an error
 */
export function getErrorMessage(error: unknown, defaultMessage = ErrorMessages.UNKNOWN_ERROR): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check for specific error patterns
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorMessages.PERMISSION_DENIED;
    }
    if (message.includes('storage') || message.includes('space') || message.includes('full')) {
      return ErrorMessages.STORAGE_FULL;
    }
    if (message.includes('network') || message.includes('connection')) {
      return ErrorMessages.NETWORK_ERROR;
    }
    
    // Return the error message if it's user-friendly, otherwise use default
    return error.message || defaultMessage;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return defaultMessage;
}
