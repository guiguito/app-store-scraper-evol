// Ratings-related types for app-store-scraper

import { BaseOptions } from './common';

/**
 * Options for the ratings() method
 */
export interface RatingsOptions extends BaseOptions {
  /** App Store ID (numeric) - required */
  id: string | number;
}

/**
 * Ratings information and histogram
 */
export interface RatingsResult {
  /** Overall rating score (1-5 scale) */
  score: number;
  /** Total number of ratings */
  reviews: number;
  /** Rating distribution histogram */
  histogram: RatingsHistogram;
  /** Current version rating score */
  currentVersionScore?: number;
  /** Current version number of ratings */
  currentVersionReviews?: number;
}

/**
 * Distribution of ratings across 1-5 stars
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