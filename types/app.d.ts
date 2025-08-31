// App-related types for app-store-scraper

import { BaseOptions, CountryCode, Screenshots, AppMetadata, RatingInfo, PriceInfo } from './common';

/**
 * Options for the app() method
 */
export interface AppOptions extends BaseOptions {
  /** App Store ID (numeric) - either this or appId is required */
  id?: string | number;
  /** Bundle identifier (com.company.app) - either this or id is required */
  appId?: string;
  /** Include ratings data in the response (default: false) */
  ratings?: boolean;
}

/**
 * Complete app information returned by the app() method
 */
export interface AppResult extends AppMetadata, RatingInfo, PriceInfo, Screenshots {
  /** App icon URL (high resolution) */
  icon: string;
  /** App Store URL */
  url: string;
  /** Developer page URL */
  developerUrl: string;
  /** Developer website URL (if available) */
  developerWebsite?: string;
  
  // Optional ratings data (included if ratings: true)
  /** Ratings histogram data (if ratings option is true) */
  histogram?: RatingsHistogram;
}

/**
 * Ratings histogram showing distribution of ratings
 */
export interface RatingsHistogram {
  /** Number of 1-star ratings */
  1: number;
  /** Number of 2-star ratings */
  2: number;
  /** Number of 3-star ratings */
  3: number;
  /** Number of 4-star ratings */
  4: number;
  /** Number of 5-star ratings */
  5: number;
}

/**
 * Options for the developer() method
 */
export interface DeveloperOptions extends BaseOptions {
  /** Developer ID (numeric) - required */
  devId: string | number;
}

/**
 * Options for the similar() method
 */
export interface SimilarOptions extends BaseOptions {
  /** App Store ID (numeric) - either this or appId is required */
  id?: string | number;
  /** Bundle identifier (com.company.app) - either this or id is required */
  appId?: string;
}

/**
 * Options for the privacy() method
 */
export interface PrivacyOptions extends BaseOptions {
  /** App Store ID (numeric) - either this or appId is required */
  id?: string | number;
  /** Bundle identifier (com.company.app) - either this or id is required */
  appId?: string;
}

/**
 * Privacy information result
 */
export interface PrivacyResult {
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
  /** Privacy policy text */
  privacyPolicyText?: string;
  /** Data collection practices */
  dataCollection?: DataCollectionPractice[];
}

/**
 * Data collection practice information
 */
export interface DataCollectionPractice {
  /** Category of data collected */
  category: string;
  /** Types of data in this category */
  dataTypes: string[];
  /** Purpose of data collection */
  purposes: string[];
  /** Whether data is linked to user identity */
  linkedToUser: boolean;
  /** Whether data is used for tracking */
  usedForTracking: boolean;
}

/**
 * Options for the versionHistory() method
 */
export interface VersionHistoryOptions extends BaseOptions {
  /** App Store ID (numeric) - either this or appId is required */
  id?: string | number;
  /** Bundle identifier (com.company.app) - either this or id is required */
  appId?: string;
  /** Maximum number of versions to return (default: 10) */
  num?: number;
}

/**
 * Version history entry
 */
export interface VersionHistoryResult {
  /** Version number */
  version: string;
  /** Release date */
  releaseDate: string;
  /** Release notes */
  releaseNotes: string;
  /** Version size in bytes */
  size?: number;
}