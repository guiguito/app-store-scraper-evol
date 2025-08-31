// Reviews-related types for app-store-scraper

import { BaseOptions } from './common';
import { SortValue } from './constants';

/**
 * Options for the reviews() method
 */
export interface ReviewsOptions extends BaseOptions {
  /** App Store ID (numeric) - either this or appId is required */
  id?: string | number;
  /** Bundle identifier (com.company.app) - either this or id is required */
  appId?: string;
  /** Sort order for reviews (default: 'mostRecent') */
  sort?: SortValue;
  /** Page number (1-10, default: 1) */
  page?: number;
}

/**
 * Individual review information
 */
export interface ReviewResult {
  /** Review ID */
  id: string;
  /** Review title */
  title: string;
  /** Review text content */
  text: string;
  /** Rating given (1-5 stars) */
  rating: number;
  /** Reviewer username */
  userName: string;
  /** Review date */
  date: string;
  /** App version reviewed */
  version: string;
  /** Review URL */
  url: string;
  /** Number of users who found review helpful */
  voteCount: number;
  /** Sum of vote scores */
  voteSum: number;
}