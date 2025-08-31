'use strict';

/**
 * Base error class for all App Store scraper errors
 */
class AppStoreError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'AppStoreError';
    this.code = code;
    this.details = details;
    
    // Maintain proper stack trace for where our error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppStoreError);
    }
  }
}

/**
 * Validation errors for invalid input parameters
 */
class ValidationError extends AppStoreError {
  constructor(message, field = null, details = {}) {
    super(message, 'VALIDATION_ERROR', { field, ...details });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Errors for when requested resources are not found
 */
class NotFoundError extends AppStoreError {
  constructor(message, resourceType = 'resource', resourceId = null) {
    super(message, 'NOT_FOUND', { resourceType, resourceId });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Network and HTTP-related errors
 */
class NetworkError extends AppStoreError {
  constructor(message, statusCode = null, details = {}) {
    const code = statusCode ? `NETWORK_ERROR_${statusCode}` : 'NETWORK_ERROR';
    super(message, code, { statusCode, ...details });
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

/**
 * Rate limiting errors
 */
class RateLimitError extends NetworkError {
  constructor(message = 'Rate limit exceeded. Please retry after a delay.', retryAfter = null) {
    super(message, 429, { retryAfter });
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMITED';
    this.retryAfter = retryAfter;
  }
}

/**
 * Parsing and data format errors
 */
class ParseError extends AppStoreError {
  constructor(message, dataType = 'data', details = {}) {
    super(message, 'PARSE_ERROR', { dataType, ...details });
    this.name = 'ParseError';
    this.dataType = dataType;
  }
}

/**
 * Service unavailable or maintenance errors
 */
class ServiceUnavailableError extends NetworkError {
  constructor(message = 'App Store service is temporarily unavailable. Please try again later.') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
    this.code = 'SERVICE_UNAVAILABLE';
  }
}

/**
 * Helper functions to create common errors with standardized messages
 */
const ErrorHelpers = {
  /**
   * Create a validation error for missing required parameters
   */
  missingParameter(paramName, suggestion = null) {
    let message = `Parameter '${paramName}' is required`;
    if (suggestion) {
      message += `. ${suggestion}`;
    }
    return new ValidationError(message, paramName);
  },

  /**
   * Create a validation error for invalid parameter values
   */
  invalidParameter(paramName, value, validOptions = null) {
    let message = `Invalid value for parameter '${paramName}': ${value}`;
    if (validOptions) {
      if (Array.isArray(validOptions)) {
        message += `. Valid options are: ${validOptions.join(', ')}`;
      } else {
        message += `. ${validOptions}`;
      }
    }
    return new ValidationError(message, paramName, { value, validOptions });
  },

  /**
   * Create an app not found error
   */
  appNotFound(appId) {
    return new NotFoundError(
      `App with ID '${appId}' was not found. Please verify the app ID is correct and the app is available in the specified country.`,
      'app',
      appId
    );
  },

  /**
   * Create a developer not found error
   */
  developerNotFound(devId) {
    return new NotFoundError(
      `Developer with ID '${devId}' was not found. Please verify the developer ID is correct.`,
      'developer',
      devId
    );
  },

  /**
   * Create a network error with helpful context
   */
  networkError(originalError, url = null) {
    let message = 'Network request failed';
    const details = { originalError: originalError.message };
    
    if (url) {
      details.url = url;
      message += ` for ${url}`;
    }

    if (originalError.code === 'ECONNREFUSED') {
      message += ': Unable to connect to App Store API. Please check your internet connection.';
    } else if (originalError.code === 'ETIMEDOUT') {
      message += ': Request timed out. The App Store API may be slow or unavailable.';
    } else if (originalError.code === 'ENOTFOUND') {
      message += ': DNS resolution failed. Please check your internet connection.';
    } else {
      message += `: ${originalError.message}`;
    }

    return new NetworkError(message, null, details);
  },

  /**
   * Create a parse error for invalid response data
   */
  invalidResponse(expectedFormat, actualContent = null) {
    let message = `Invalid response format. Expected ${expectedFormat}`;
    if (actualContent) {
      message += `, but received: ${actualContent.substring(0, 100)}${actualContent.length > 100 ? '...' : ''}`;
    }
    return new ParseError(message, expectedFormat, { actualContent });
  }
};

module.exports = {
  AppStoreError,
  ValidationError,
  NotFoundError,
  NetworkError,
  RateLimitError,
  ParseError,
  ServiceUnavailableError,
  ErrorHelpers
};