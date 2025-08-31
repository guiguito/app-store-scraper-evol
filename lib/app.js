'use strict';

const common = require('./common');
const ratings = require('./ratings');
const { getScreenshotsWithFallback } = require('./screenshot-fallback');
const { ValidationError, ErrorHelpers } = require('./errors');

async function app (opts) {
  // Input validation
  if (!opts || typeof opts !== 'object') {
    throw new ValidationError('Options object is required');
  }
  
  if (!opts.id && !opts.appId) {
    throw ErrorHelpers.missingParameter('id or appId', 'Provide either "id" (numeric App Store ID) or "appId" (bundle identifier like com.company.app)');
  }
  
  // Validate ID format if provided
  if (opts.id && (typeof opts.id !== 'string' && typeof opts.id !== 'number')) {
    throw ErrorHelpers.invalidParameter('id', opts.id, 'Must be a string or number');
  }
  
  if (opts.appId && typeof opts.appId !== 'string') {
    throw ErrorHelpers.invalidParameter('appId', opts.appId, 'Must be a string in format com.company.app');
  }
  
  // Validate country code if provided
  if (opts.country && (typeof opts.country !== 'string' || opts.country.length !== 2)) {
    throw ErrorHelpers.invalidParameter('country', opts.country, 'Must be a 2-letter country code (e.g., "us", "gb", "fr")');
  }
  
  const idField = opts.id ? 'id' : 'bundleId';
  const idValue = opts.id || opts.appId;
  
  const results = await common.lookup([idValue], idField, opts.country, opts.lang, opts.requestOptions, opts.throttle);
  
  if (results.length === 0) {
    throw ErrorHelpers.appNotFound(idValue);
  }

  let result = results[0];

  // Apply screenshot fallback if screenshots are missing
  if (result.screenshots && result.screenshots.length > 0 && 
      result.ipadScreenshots && result.ipadScreenshots.length > 0) {
    // Already have sufficient screenshots from iTunes API
  } else {
    // Apply fallback for missing screenshots
    try {
      result = await getScreenshotsWithFallback(result, opts.id || result.id, opts.country);
    } catch (fallbackError) {
      // Screenshot fallback failure should not prevent app data return
      // Log the error but continue with original app data
      const debug = require('debug')('app-store-scraper');
      debug('Screenshot fallback failed: %s', fallbackError.message);
    }
  }

  if (opts.ratings) {
    if (!opts.id) { opts.id = result.id; }
    try {
      const ratingsResult = await ratings(opts);
      return Object.assign({}, result, ratingsResult);
    } catch (ratingsError) {
      // Ratings failure should not prevent app data return
      const debug = require('debug')('app-store-scraper');
      debug('Ratings fetch failed: %s', ratingsError.message);
      return result;
    }
  }

  return result;
}

module.exports = app;
