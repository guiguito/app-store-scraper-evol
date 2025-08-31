// TypeScript definitions for app-store-scraper
// Project: https://github.com/facundoolano/app-store-scraper
// Definitions by: Enhanced with comprehensive error handling

/// <reference path="./types/errors.d.ts" />
/// <reference path="./types/common.d.ts" />
/// <reference path="./types/app.d.ts" />
/// <reference path="./types/search.d.ts" />
/// <reference path="./types/list.d.ts" />
/// <reference path="./types/reviews.d.ts" />
/// <reference path="./types/ratings.d.ts" />
/// <reference path="./types/constants.d.ts" />

declare namespace AppStoreScraper {
  // Re-export all types from individual modules
  export * from './types/errors';
  export * from './types/common';
  export * from './types/app';
  export * from './types/search';
  export * from './types/list';
  export * from './types/reviews';
  export * from './types/ratings';
  export * from './types/constants';

  /**
   * Memoization options for caching API responses
   */
  export interface MemoizeOptions {
    /** Cache primitive values only */
    primitive?: boolean;
    /** Function to normalize cache keys */
    normalizer?: (args: any[]) => string;
    /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
    maxAge?: number;
    /** Maximum number of cached items (default: 1000) */
    max?: number;
  }

  /**
   * Memoized version of all scraper methods with caching
   */
  export interface MemoizedMethods {
    app: typeof app;
    list: typeof list;
    search: typeof search;
    developer: typeof developer;
    privacy: typeof privacy;
    suggest: typeof suggest;
    similar: typeof similar;
    reviews: typeof reviews;
    ratings: typeof ratings;
    versionHistory: typeof versionHistory;
  }
}

/**
 * Get detailed information about a specific app
 */
declare function app(options: AppStoreScraper.AppOptions): Promise<AppStoreScraper.AppResult>;

/**
 * Search for apps in the App Store
 */
declare function search(options: AppStoreScraper.SearchOptions): Promise<AppStoreScraper.SearchResult[]>;

/**
 * Get apps from App Store lists/collections
 */
declare function list(options?: AppStoreScraper.ListOptions): Promise<AppStoreScraper.AppResult[]>;

/**
 * Get apps by a specific developer
 */
declare function developer(options: AppStoreScraper.DeveloperOptions): Promise<AppStoreScraper.AppResult[]>;

/**
 * Get privacy information for an app
 */
declare function privacy(options: AppStoreScraper.PrivacyOptions): Promise<AppStoreScraper.PrivacyResult>;

/**
 * Get search term suggestions
 */
declare function suggest(options: AppStoreScraper.SuggestOptions): Promise<string[]>;

/**
 * Get apps similar to a specific app
 */
declare function similar(options: AppStoreScraper.SimilarOptions): Promise<AppStoreScraper.AppResult[]>;

/**
 * Get reviews for a specific app
 */
declare function reviews(options: AppStoreScraper.ReviewsOptions): Promise<AppStoreScraper.ReviewResult[]>;

/**
 * Get ratings and histogram data for a specific app
 */
declare function ratings(options: AppStoreScraper.RatingsOptions): Promise<AppStoreScraper.RatingsResult>;

/**
 * Get version history for a specific app
 */
declare function versionHistory(options: AppStoreScraper.VersionHistoryOptions): Promise<AppStoreScraper.VersionHistoryResult[]>;

/**
 * Create memoized versions of all methods with caching
 */
declare function memoized(options?: AppStoreScraper.MemoizeOptions): AppStoreScraper.MemoizedMethods & AppStoreScraper.Constants;

// Export constants
declare const collection: AppStoreScraper.Collection;
declare const category: AppStoreScraper.Category;
declare const device: AppStoreScraper.Device;
declare const sort: AppStoreScraper.Sort;
declare const country: AppStoreScraper.Country;
declare const markets: AppStoreScraper.Markets;

// Main module interface
interface AppStoreScraperModule extends AppStoreScraper.Constants {
  app: typeof app;
  search: typeof search;
  list: typeof list;
  developer: typeof developer;
  privacy: typeof privacy;
  suggest: typeof suggest;
  similar: typeof similar;
  reviews: typeof reviews;
  ratings: typeof ratings;
  versionHistory: typeof versionHistory;
  memoized: typeof memoized;
}

declare const appStoreScraper: AppStoreScraperModule;
export = appStoreScraper;