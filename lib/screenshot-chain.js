'use strict';

const debug = require('debug')('app-store-scraper:screenshot-chain');
const { extractScreenshotsFromWeb } = require('./screenshot-fallback');
const { ContentDeduplicator } = require('./content-deduplicator');
const { SmartFilter } = require('./smart-filter');
const { ScreenshotValidator } = require('./screenshot-validator');

/**
 * Robust screenshot extraction chain with multiple fallback strategies
 * Provides reliable screenshot extraction by trying multiple approaches
 */
class ScreenshotChain {
  constructor() {
    this.validator = new ScreenshotValidator();
    this.deduplicator = new ContentDeduplicator();
    this.smartFilter = new SmartFilter();
    this.debug = debug;
  }

  /**
   * Extracts screenshots using a robust fallback chain
   * @param {Object} appData - App data from iTunes API
   * @param {string} appId - iTunes app ID
   * @param {string} country - Country code
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Enhanced app data with reliable screenshots
   */
  async extract(appData, appId, country = 'us', options = {}) {
    const {
      forceRefresh = false,
      skipValidation = false,
      maxRetries = 2
    } = options;

    debug('Starting robust screenshot extraction for app %s', appId);

    // Step 1: Check if iTunes API data is sufficient and valid
    if (!forceRefresh) {
      const apiResult = await this.tryItunesApi(appData, appId, country, skipValidation);
      if (apiResult.success) {
        debug('iTunes API provided valid screenshots');
        return apiResult.data;
      }
      debug('iTunes API insufficient: %s', apiResult.reason);
    }

    // Step 2: Try web scraping with fallback strategies
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      debug('Web scraping attempt %d/%d', attempt, maxRetries);
      
      try {
        const webResult = await this.tryWebScraping(appData, appId, country, {
          attempt,
          skipValidation
        });
        
        if (webResult.success) {
          debug('Web scraping successful on attempt %d', attempt);
          return webResult.data;
        }
        
        lastError = webResult.error;
        debug('Web scraping attempt %d failed: %s', attempt, webResult.reason);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await this.delay(1000 * Math.pow(2, attempt - 1));
        }
        
      } catch (error) {
        lastError = error;
        debug('Web scraping attempt %d threw error: %s', attempt, error.message);
      }
    }

    // Step 3: Final fallback - return best available data with warnings
    debug('All extraction methods failed, returning best available data');
    const fallbackResult = await this.createFallbackResult(appData, lastError);
    
    return fallbackResult;
  }

  async tryItunesApi(appData, appId, country, skipValidation) {
    try {
      const hasIphone = appData.screenshots && appData.screenshots.length > 0;
      const hasIpad = appData.ipadScreenshots && appData.ipadScreenshots.length > 0;
      
      // Check basic availability
      if (!hasIphone && !hasIpad) {
        return { success: false, reason: 'no_screenshots_in_api' };
      }

      // Validate quality if not skipped
      if (!skipValidation) {
        const validation = await this.validator.validateScreenshots(appData, appId, country);
        if (!validation.isValid) {
          return { 
            success: false, 
            reason: 'validation_failed',
            details: validation.issues.join(', ')
          };
        }
      }

      // Apply processing to ensure consistency
      const processed = await this.processScreenshots(appData);
      
      return { success: true, data: processed };
      
    } catch (error) {
      return { success: false, reason: 'api_processing_error', error };
    }
  }

  async tryWebScraping(appData, appId, country, options = {}) {
    try {
      const { attempt = 1, skipValidation = false } = options;
      
      // Extract raw screenshots from web
      const webScreenshots = await extractScreenshotsFromWeb(appId, country);
      
      // Check if extraction was successful
      const totalScreenshots = webScreenshots.screenshots.length + 
                               webScreenshots.ipadScreenshots.length + 
                               webScreenshots.appletvScreenshots.length;
      
      if (totalScreenshots === 0) {
        return { success: false, reason: 'no_screenshots_extracted' };
      }

      // Process and validate the extracted screenshots
      const processed = await this.processScreenshots({
        ...appData,
        screenshots: webScreenshots.screenshots,
        ipadScreenshots: webScreenshots.ipadScreenshots,
        appletvScreenshots: webScreenshots.appletvScreenshots
      });

      // Validate result if not skipped
      if (!skipValidation) {
        const validation = await this.validator.validateScreenshots(processed, appId, country);
        if (!validation.isValid && validation.confidence < 0.5) {
          return { 
            success: false, 
            reason: 'web_validation_failed',
            details: validation.issues.join(', ')
          };
        }
      }

      return { success: true, data: processed };
      
    } catch (error) {
      return { success: false, reason: 'web_scraping_error', error };
    }
  }

  async processScreenshots(appData) {
    debug('Processing screenshots through deduplication and smart filtering');
    
    let { screenshots, ipadScreenshots, appletvScreenshots } = appData;

    // Ensure we have arrays
    screenshots = screenshots || [];
    ipadScreenshots = ipadScreenshots || [];
    appletvScreenshots = appletvScreenshots || [];

    // Remove exact duplicates first
    screenshots = [...new Set(screenshots)].filter(Boolean);
    ipadScreenshots = [...new Set(ipadScreenshots)].filter(Boolean);
    appletvScreenshots = [...new Set(appletvScreenshots)].filter(Boolean);

    // Apply content-based deduplication
    if (screenshots.length > 0) {
      screenshots = this.deduplicator.deduplicate(screenshots, 'iPhone');
    }
    if (ipadScreenshots.length > 0) {
      ipadScreenshots = this.deduplicator.deduplicate(ipadScreenshots, 'iPad');
    }
    if (appletvScreenshots.length > 0) {
      appletvScreenshots = this.deduplicator.deduplicate(appletvScreenshots, 'AppleTV');
    }

    // Apply smart filtering based on observable patterns
    if (screenshots.length > 0) {
      screenshots = this.smartFilter.filter(screenshots, 'iPhone');
    }
    if (ipadScreenshots.length > 0) {
      ipadScreenshots = this.smartFilter.filter(ipadScreenshots, 'iPad');
    }
    if (appletvScreenshots.length > 0) {
      appletvScreenshots = this.smartFilter.filter(appletvScreenshots, 'AppleTV');
    }

    debug('Processing complete - iPhone: %d, iPad: %d, AppleTV: %d',
          screenshots.length, ipadScreenshots.length, appletvScreenshots.length);

    return {
      ...appData,
      screenshots,
      ipadScreenshots,
      appletvScreenshots
    };
  }

  async createFallbackResult(appData, lastError) {
    debug('Creating fallback result with best available data');
    
    // Try to return something useful even if everything failed
    const fallbackData = {
      ...appData,
      screenshots: appData.screenshots || [],
      ipadScreenshots: appData.ipadScreenshots || [],
      appletvScreenshots: appData.appletvScreenshots || [],
      _screenshotExtractionWarning: 'Screenshot extraction failed, using available data',
      _lastError: lastError?.message || 'Unknown error'
    };

    // Apply basic processing even to fallback data
    try {
      return await this.processScreenshots(fallbackData);
    } catch (processError) {
      debug('Fallback processing failed: %s', processError.message);
      return fallbackData;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates that the extraction result meets quality standards
   * @param {Object} result - Extraction result to validate
   * @param {string} appId - App ID for context
   * @returns {Object} Validation result
   */
  async validateResult(result, appId) {
    const screenshots = result.screenshots || [];
    const ipadScreenshots = result.ipadScreenshots || [];
    const totalScreenshots = screenshots.length + ipadScreenshots.length;

    const validation = {
      isValid: true,
      warnings: [],
      quality: 'good'
    };

    // Check minimum screenshot count
    if (totalScreenshots === 0) {
      validation.isValid = false;
      validation.warnings.push('No screenshots extracted');
      validation.quality = 'poor';
    } else if (totalScreenshots < 3) {
      validation.warnings.push('Very few screenshots extracted');
      validation.quality = 'fair';
    }

    // Check for excessive duplicates (shouldn't happen with new system)
    const duplicates = this.detectRemainingDuplicates(screenshots.concat(ipadScreenshots));
    if (duplicates.count > 0) {
      validation.warnings.push(`${duplicates.count} potential duplicates detected`);
      if (duplicates.ratio > 0.3) {
        validation.quality = 'poor';
      }
    }

    // Check URL accessibility (sample)
    const urlCheck = await this.checkUrlAccessibility([...screenshots, ...ipadScreenshots].slice(0, 3));
    if (urlCheck.failureRate > 0.5) {
      validation.warnings.push('Many screenshots URLs are not accessible');
      validation.quality = 'poor';
    }

    debug('Result validation for app %s: %s (%s) - %s', 
          appId, validation.isValid ? 'VALID' : 'INVALID', 
          validation.quality, validation.warnings.join(', '));

    return validation;
  }

  detectRemainingDuplicates(urls) {
    const seen = new Set();
    let duplicates = 0;

    urls.forEach(url => {
      const normalized = this.normalizeUrlForComparison(url);
      if (seen.has(normalized)) {
        duplicates++;
      } else {
        seen.add(normalized);
      }
    });

    return {
      count: duplicates,
      ratio: urls.length > 0 ? duplicates / urls.length : 0
    };
  }

  normalizeUrlForComparison(url) {
    // Remove size variations and version suffixes for comparison
    return url
      .replace(/\d+x\d+[^/]*/, 'SIZE')
      .replace(/_new|_orig|_retry/, '_VER');
  }

  async checkUrlAccessibility(urls) {
    if (urls.length === 0) return { failureRate: 0 };

    let failures = 0;
    const sampleUrls = urls.slice(0, 3); // Check at most 3 URLs

    for (const url of sampleUrls) {
      try {
        const axios = require('axios');
        const response = await axios.head(url, { 
          timeout: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ScreenshotChain/1.0)'
          }
        });
        
        if (response.status !== 200) {
          failures++;
        }
      } catch (error) {
        failures++;
      }
    }

    return {
      failureRate: failures / sampleUrls.length,
      checkedUrls: sampleUrls.length,
      failures
    };
  }
}

module.exports = { ScreenshotChain };