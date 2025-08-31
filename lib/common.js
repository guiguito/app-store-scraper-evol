'use strict';

const axios = require('axios');
const rateLimit = require('axios-rate-limit');
const debug = require('debug')('app-store-scraper');
const c = require('./constants');
const { NetworkError, RateLimitError, ServiceUnavailableError, ParseError, ErrorHelpers } = require('./errors');

function cleanApp (app) {
  return {
    id: app.trackId,
    appId: app.bundleId,
    title: app.trackName,
    url: app.trackViewUrl,
    description: app.description,
    icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
    genres: app.genres,
    genreIds: app.genreIds,
    primaryGenre: app.primaryGenreName,
    primaryGenreId: app.primaryGenreId,
    contentRating: app.contentAdvisoryRating,
    languages: app.languageCodesISO2A,
    size: app.fileSizeBytes,
    requiredOsVersion: app.minimumOsVersion,
    released: app.releaseDate,
    updated: app.currentVersionReleaseDate || app.releaseDate,
    releaseNotes: app.releaseNotes,
    version: app.version,
    price: app.price,
    currency: app.currency,
    free: app.price === 0,
    developerId: app.artistId,
    developer: app.artistName,
    developerUrl: app.artistViewUrl,
    developerWebsite: app.sellerUrl,
    score: app.averageUserRating,
    reviews: app.userRatingCount,
    currentVersionScore: app.averageUserRatingForCurrentVersion,
    currentVersionReviews: app.userRatingCountForCurrentVersion,
    screenshots: app.screenshotUrls,
    ipadScreenshots: app.ipadScreenshotUrls,
    appletvScreenshots: app.appletvScreenshotUrls,
    supportedDevices: app.supportedDevices
  };
}

// TODO add an optional parse function
const doRequest = async (url, headers, requestOptions, limit) => {
  debug('Making request: %s %j %o', url, headers, requestOptions);

  requestOptions = Object.assign({ method: 'GET' }, requestOptions);

  let axiosInstance = axios;
  if (limit) {
    axiosInstance = rateLimit(axios.create(), {
      maxRequests: limit,
      perMilliseconds: 1000
    });
  }

  try {
    const response = await axiosInstance({
      url,
      headers,
      ...requestOptions,
      validateStatus: (status) => status < 400
    });
    debug('Finished request');
    return response.data;
  } catch (error) {
    debug('Request error', error.message);
    
    // Handle HTTP response errors
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText || 'Unknown error';
      
      // Create appropriate error types based on status code
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        throw new RateLimitError(
          `Rate limit exceeded for ${url}. Please retry after ${retryAfter || 'a short'} delay.`,
          retryAfter
        );
      } else if (status === 404) {
        throw new NetworkError(
          `Resource not found at ${url}. Please verify the URL and parameters are correct.`,
          404,
          { url, statusText }
        );
      } else if (status === 503) {
        throw new ServiceUnavailableError(
          `App Store service is temporarily unavailable (${statusText}). Please try again later.`
        );
      } else if (status >= 400 && status < 500) {
        throw new NetworkError(
          `Client error (${status}): ${statusText}. Please check your request parameters.`,
          status,
          { url, statusText }
        );
      } else if (status >= 500) {
        throw new NetworkError(
          `Server error (${status}): ${statusText}. The App Store API may be experiencing issues.`,
          status,
          { url, statusText }
        );
      } else {
        throw new NetworkError(
          `HTTP error (${status}): ${statusText}`,
          status,
          { url, statusText }
        );
      }
    }
    
    // Handle network errors (no response received)
    if (error.request) {
      throw ErrorHelpers.networkError(error, url);
    }
    
    // Handle other axios errors
    throw new NetworkError(
      `Request configuration error: ${error.message}`,
      null,
      { originalError: error.message, url }
    );
  }
};

const LOOKUP_URL = 'https://itunes.apple.com/lookup';

async function lookup (ids, idField, country, lang, requestOptions, limit) {
  // Input validation
  if (!Array.isArray(ids) || ids.length === 0) {
    throw ErrorHelpers.missingParameter('ids', 'Provide an array of app IDs to lookup');
  }

  idField = idField || 'id';
  country = country || 'us';
  const langParam = lang ? `&lang=${lang}` : '';
  const joinedIds = ids.join(',');
  const url = `${LOOKUP_URL}?${idField}=${joinedIds}&country=${country}&entity=software${langParam}`;
  
  let data;
  try {
    data = await doRequest(url, {}, requestOptions, limit);
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof NetworkError && error.statusCode === 404) {
      throw ErrorHelpers.appNotFound(joinedIds);
    }
    throw error;
  }
  
  // Parse JSON if needed
  let results;
  try {
    results = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (parseError) {
    throw ErrorHelpers.invalidResponse('valid JSON', data);
  }

  // Validate response structure
  if (!results || typeof results !== 'object') {
    throw ErrorHelpers.invalidResponse('iTunes API response object', results);
  }
  
  if (!Array.isArray(results.results)) {
    throw ErrorHelpers.invalidResponse('iTunes API results array', results);
  }

  return results.results
    .filter(function (app) {
      return typeof app.wrapperType === 'undefined' || app.wrapperType === 'software';
    })
    .map(cleanApp);
}

function storeId (countryCode) {
  const markets = c.markets;
  const defaultStore = '143441';
  return (countryCode && markets[countryCode.toUpperCase()]) || defaultStore;
}

module.exports = { cleanApp, lookup, request: doRequest, storeId };
