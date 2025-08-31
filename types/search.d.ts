// Search-related types for app-store-scraper

import { BaseOptions, CountryCode } from './common';
import { AppResult } from './app';

/**
 * Options for the search() method
 */
export interface SearchOptions extends BaseOptions {
  /** Search term - required */
  term: string;
  /** Number of results to return (1-200, default: 50) */
  num?: number;
  /** Page number (starts from 1, default: 1) */
  page?: number;
  /** Return only app IDs instead of full app data (default: false) */
  idsOnly?: boolean;
}

/**
 * Search result - same as AppResult but from search context
 */
export type SearchResult = AppResult;

/**
 * Options for the suggest() method
 */
export interface SuggestOptions extends BaseOptions {
  /** Partial search term to get suggestions for - required */
  term: string;
}

/**
 * Options for the list() method
 */
export interface ListOptions extends BaseOptions {
  /** Collection type (default: 'topfreeapplications') */
  collection?: CollectionType;
  /** Category filter (optional) */
  category?: number;
  /** Number of results (1-200, default: 50) */
  num?: number;
}

/**
 * Valid collection types for the list() method
 */
export type CollectionType = 
  | 'topmacapps'
  | 'topfreemacapps'
  | 'topgrossingmacapps'
  | 'toppaidmacapps'
  | 'newapplications'
  | 'newfreeapplications'
  | 'newpaidapplications'
  | 'topfreeapplications'
  | 'topfreeipadapplications'
  | 'topgrossingapplications'
  | 'topgrossingipadapplications'
  | 'toppaidapplications'
  | 'toppaidipadapplications';