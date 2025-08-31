// Error handling types for app-store-scraper

export type ErrorCode = 
  | 'UNKNOWN_ERROR'
  | 'VALIDATION_ERROR' 
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'NETWORK_ERROR_400'
  | 'NETWORK_ERROR_404'
  | 'NETWORK_ERROR_429'
  | 'NETWORK_ERROR_503'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'PARSE_ERROR'
  | 'INVALID_RESPONSE';

export interface ErrorDetails {
  [key: string]: any;
}

/**
 * Base error class for all App Store scraper errors
 */
export declare class AppStoreError extends Error {
  readonly name: 'AppStoreError';
  readonly code: ErrorCode;
  readonly details: ErrorDetails;
  
  constructor(message: string, code?: ErrorCode, details?: ErrorDetails);
}

/**
 * Validation errors for invalid input parameters
 */
export declare class ValidationError extends AppStoreError {
  readonly name: 'ValidationError';
  readonly code: 'VALIDATION_ERROR';
  readonly field?: string;
  
  constructor(message: string, field?: string, details?: ErrorDetails);
}

/**
 * Errors for when requested resources are not found
 */
export declare class NotFoundError extends AppStoreError {
  readonly name: 'NotFoundError';
  readonly code: 'NOT_FOUND';
  readonly resourceType: string;
  readonly resourceId?: string;
  
  constructor(message: string, resourceType?: string, resourceId?: string);
}

/**
 * Network and HTTP-related errors
 */
export declare class NetworkError extends AppStoreError {
  readonly name: 'NetworkError';
  readonly code: ErrorCode;
  readonly statusCode?: number;
  
  constructor(message: string, statusCode?: number, details?: ErrorDetails);
}

/**
 * Rate limiting errors
 */
export declare class RateLimitError extends NetworkError {
  readonly name: 'RateLimitError';
  readonly code: 'RATE_LIMITED';
  readonly retryAfter?: number;
  
  constructor(message?: string, retryAfter?: number);
}

/**
 * Parsing and data format errors
 */
export declare class ParseError extends AppStoreError {
  readonly name: 'ParseError';
  readonly code: 'PARSE_ERROR';
  readonly dataType: string;
  
  constructor(message: string, dataType?: string, details?: ErrorDetails);
}

/**
 * Service unavailable or maintenance errors
 */
export declare class ServiceUnavailableError extends NetworkError {
  readonly name: 'ServiceUnavailableError';
  readonly code: 'SERVICE_UNAVAILABLE';
  
  constructor(message?: string);
}

/**
 * Helper functions to create common errors with standardized messages
 */
export declare namespace ErrorHelpers {
  /**
   * Create a validation error for missing required parameters
   */
  function missingParameter(paramName: string, suggestion?: string): ValidationError;

  /**
   * Create a validation error for invalid parameter values
   */
  function invalidParameter(paramName: string, value: any, validOptions?: string | string[]): ValidationError;

  /**
   * Create an app not found error
   */
  function appNotFound(appId: string): NotFoundError;

  /**
   * Create a developer not found error
   */
  function developerNotFound(devId: string): NotFoundError;

  /**
   * Create a network error with helpful context
   */
  function networkError(originalError: Error, url?: string): NetworkError;

  /**
   * Create a parse error for invalid response data
   */
  function invalidResponse(expectedFormat: string, actualContent?: string): ParseError;
}

/**
 * Union type of all possible errors that can be thrown by the library
 */
export type AppStoreScraperError = 
  | AppStoreError
  | ValidationError
  | NotFoundError
  | NetworkError
  | RateLimitError
  | ParseError
  | ServiceUnavailableError;