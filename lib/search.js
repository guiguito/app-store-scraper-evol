'use strict';

const R = require('ramda');
const common = require('./common');
const { ValidationError, ParseError, ErrorHelpers } = require('./errors');
const BASE_URL = 'https://search.itunes.apple.com/WebObjects/MZStore.woa/wa/search?clientApplication=Software&media=software&term=';

// TODO find out if there's a way to filter by device
// TODO refactor to allow memoization of the first request

function paginate (num, page) {
  num = num || 50;
  page = page - 1 || 0;
  const pageStart = num * page;
  const pageEnd = pageStart + num;
  return R.slice(pageStart, pageEnd);
}

async function search (opts) {
  // Input validation
  if (!opts || typeof opts !== 'object') {
    throw new ValidationError('Options object is required');
  }
  
  if (!opts.term || typeof opts.term !== 'string') {
    throw ErrorHelpers.missingParameter('term', 'Provide a search term as a non-empty string');
  }
  
  if (opts.term.trim().length === 0) {
    throw ErrorHelpers.invalidParameter('term', opts.term, 'Search term cannot be empty or contain only whitespace');
  }
  
  // Validate optional parameters
  if (opts.num && (typeof opts.num !== 'number' || opts.num < 1 || opts.num > 200)) {
    throw ErrorHelpers.invalidParameter('num', opts.num, 'Must be a number between 1 and 200');
  }
  
  if (opts.page && (typeof opts.page !== 'number' || opts.page < 1)) {
    throw ErrorHelpers.invalidParameter('page', opts.page, 'Must be a number starting from 1');
  }
  
  if (opts.country && (typeof opts.country !== 'string' || opts.country.length !== 2)) {
    throw ErrorHelpers.invalidParameter('country', opts.country, 'Must be a 2-letter country code (e.g., "us", "gb", "fr")');
  }
  
  const url = BASE_URL + encodeURIComponent(opts.term);
  const storeId = common.storeId(opts.country);
  const lang = opts.lang || 'en-us';

  try {
    const response = await common.request(
      url,
      {
        'X-Apple-Store-Front': `${storeId},24 t:native`,
        'Accept-Language': lang
      },
      opts.requestOptions
    );
    
    // Parse and validate response
    let data;
    try {
      data = typeof response === 'string' ? JSON.parse(response) : response;
    } catch (parseError) {
      throw ErrorHelpers.invalidResponse('valid JSON', response);
    }
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw ErrorHelpers.invalidResponse('search response object', data);
    }
    
    if (!data.bubbles || !Array.isArray(data.bubbles)) {
      // Empty search results is valid, but malformed structure is not
      if (data.bubbles === undefined) {
        return []; // No results found
      }
      throw ErrorHelpers.invalidResponse('search results with bubbles array', data);
    }
    
    const results = (data.bubbles[0] && data.bubbles[0].results) || [];
    const paginatedResults = paginate(opts.num, opts.page)(results);
    const ids = R.pluck('id', paginatedResults);
    
    if (opts.idsOnly) {
      return ids;
    }
    
    // If no IDs found, return empty array
    if (ids.length === 0) {
      return [];
    }
    
    return await common.lookup(ids, 'id', opts.country, opts.lang, opts.requestOptions, opts.throttle);
    
  } catch (error) {
    // Re-throw with additional context if it's our error type
    if (error.name && error.name.includes('Error')) {
      throw error;
    }
    // Wrap unexpected errors
    throw ErrorHelpers.invalidResponse('search API response', error.message);
  }
}

module.exports = search;
