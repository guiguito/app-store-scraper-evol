// Common types used across the app-store-scraper library

/**
 * ISO 3166-1 alpha-2 country codes supported by the iTunes Store
 */
export type CountryCode = 
  | 'us' | 'gb' | 'fr' | 'de' | 'it' | 'es' | 'pt' | 'nl' | 'be' | 'ch'
  | 'at' | 'se' | 'no' | 'dk' | 'fi' | 'ie' | 'lu' | 'ca' | 'au' | 'nz'
  | 'jp' | 'kr' | 'cn' | 'hk' | 'tw' | 'sg' | 'my' | 'th' | 'ph' | 'vn'
  | 'in' | 'id' | 'ae' | 'sa' | 'il' | 'za' | 'eg' | 'br' | 'mx' | 'ar'
  | 'cl' | 'co' | 'pe' | 've' | 'ec' | 'gt' | 'cr' | 'pa' | 'do' | 'hn'
  | 'ni' | 'sv' | 'bz' | 'uy' | 'py' | 'bo' | 'jm' | 'bb' | 'ag' | 'bs'
  | 'dm' | 'gd' | 'kn' | 'lc' | 'vc' | 'tt' | 'gy' | 'sr' | 'fj' | 'pg'
  | 'sb' | 'vu' | 'ws' | 'to' | 'fm' | 'mh' | 'pw' | 'nr' | 'ki' | 'tv';

/**
 * Language codes in format 'en-us', 'fr-fr', etc.
 */
export type LanguageCode = string;

/**
 * Common request options that can be passed to HTTP requests
 */
export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers to include in the request */
  headers?: { [key: string]: string };
  /** HTTP method (default: 'GET') */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request body for POST/PUT requests */
  body?: any;
  /** Follow redirects (default: true) */
  followRedirect?: boolean;
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
}

/**
 * Screenshot URLs for different device types
 */
export interface Screenshots {
  /** iPhone screenshot URLs */
  screenshots: string[];
  /** iPad screenshot URLs */
  ipadScreenshots: string[];
  /** Apple TV screenshot URLs */
  appletvScreenshots: string[];
}

/**
 * App Store URL patterns for different regions
 */
export interface StoreUrls {
  /** App Store view URL */
  trackViewUrl: string;
  /** Developer view URL */
  artistViewUrl?: string;
  /** Developer website URL */
  sellerUrl?: string;
}

/**
 * Price information
 */
export interface PriceInfo {
  /** Price amount (0 for free apps) */
  price: number;
  /** Currency code (USD, EUR, etc.) */
  currency: string;
  /** Whether the app is free */
  free: boolean;
}

/**
 * App ratings information
 */
export interface RatingInfo {
  /** Average user rating (1-5 scale) */
  score: number;
  /** Total number of ratings */
  reviews: number;
  /** Average rating for current version */
  currentVersionScore: number;
  /** Number of ratings for current version */
  currentVersionReviews: number;
}

/**
 * App metadata information
 */
export interface AppMetadata {
  /** App Store ID (numeric) */
  id: number;
  /** Bundle identifier (com.company.app) */
  appId: string;
  /** App name */
  title: string;
  /** App description */
  description: string;
  /** Developer name */
  developer: string;
  /** Developer ID */
  developerId: number;
  /** Primary genre name */
  primaryGenre: string;
  /** Primary genre ID */
  primaryGenreId: number;
  /** Array of all genre names */
  genres: string[];
  /** Array of all genre IDs */
  genreIds: number[];
  /** Content rating (4+, 9+, 12+, 17+) */
  contentRating: string;
  /** Supported languages */
  languages: string[];
  /** File size in bytes */
  size: number;
  /** Minimum OS version required */
  requiredOsVersion: string;
  /** Original release date */
  released: string;
  /** Last update date */
  updated: string;
  /** Release notes for current version */
  releaseNotes: string;
  /** Current version number */
  version: string;
}

/**
 * Base options that most methods accept
 */
export interface BaseOptions {
  /** Country code (default: 'us') */
  country?: CountryCode;
  /** Language code (default: 'en-us') */
  lang?: LanguageCode;
  /** Custom request options */
  requestOptions?: RequestOptions;
  /** Request throttling limit (requests per second) */
  throttle?: number;
}