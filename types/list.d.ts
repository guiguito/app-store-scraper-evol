// List-related types for app-store-scraper

import { BaseOptions } from './common';
import { AppResult } from './app';
import { CollectionValue, CategoryValue } from './constants';

/**
 * Options for the list() method
 */
export interface ListOptions extends BaseOptions {
  /** Collection type (default: TOP_FREE_IOS) */
  collection?: CollectionValue;
  /** Category filter (numeric ID, optional) */
  category?: CategoryValue;
  /** Number of results (1-200, default: 50) */
  num?: number;
}

/**
 * List result - array of apps from the specified collection/category
 */
export type ListResult = AppResult[];