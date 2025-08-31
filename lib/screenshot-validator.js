'use strict';

const axios = require('axios');
const debug = require('debug')('app-store-scraper:screenshot-validator');

/**
 * Validates that screenshot data is fresh and matches current App Store reality
 * This helps detect cached/stale data that doesn't reflect current app screenshots
 */
class ScreenshotValidator {
  constructor() {
    this.validationCache = new Map(); // Cache validation results to avoid excessive requests
    this.maxCacheAge = 60000; // 1 minute validation cache
  }

  /**
   * Validates screenshot data freshness by checking against current App Store page
   * @param {Object} appData - App data with screenshots to validate
   * @param {string} appId - iTunes app ID
   * @param {string} country - Country code
   * @returns {Promise<Object>} Validation result with recommendations
   */
  async validateScreenshots(appData, appId, country = 'us') {
    const cacheKey = `${appId}_${country}`;
    const cached = this.validationCache.get(cacheKey);
    
    // Use cached validation if recent
    if (cached && (Date.now() - cached.timestamp) < this.maxCacheAge) {
      debug('Using cached validation result for %s', appId);
      return cached.result;
    }

    debug('Validating screenshots for app %s in country %s', appId, country);

    try {
      const validation = await this._performValidation(appData, appId, country);
      
      // Cache the validation result
      this.validationCache.set(cacheKey, {
        timestamp: Date.now(),
        result: validation
      });

      return validation;
    } catch (error) {
      debug('Validation failed for app %s: %s', appId, error.message);
      return {
        isValid: false,
        confidence: 0,
        issues: ['validation_failed'],
        recommendations: ['force_refresh']
      };
    }
  }

  async _performValidation(appData, appId, country) {
    const issues = [];
    let confidence = 1.0;

    // Check 1: Validate that app still exists on App Store
    const pageExists = await this._checkAppPageExists(appId, country);
    if (!pageExists) {
      issues.push('app_not_found');
      confidence = 0;
      return { isValid: false, confidence, issues, recommendations: ['app_removed'] };
    }

    // Check 2: Detect potentially stale screenshots based on patterns
    const screenshotIssues = this._analyzeScreenshotPatterns(appData);
    issues.push(...screenshotIssues.issues);
    confidence *= screenshotIssues.confidence;

    // Check 3: Validate screenshot URLs are still accessible
    const urlValidation = await this._validateScreenshotUrls(appData);
    issues.push(...urlValidation.issues);
    confidence *= urlValidation.confidence;

    const isValid = confidence > 0.7 && issues.length === 0;
    const recommendations = this._generateRecommendations(issues, confidence);

    debug('Validation complete - Valid: %s, Confidence: %f, Issues: %o', 
          isValid, confidence, issues);

    return {
      isValid,
      confidence,
      issues,
      recommendations
    };
  }

  async _checkAppPageExists(appId, country) {
    try {
      const url = `https://apps.apple.com/${country}/app/id${appId}`;
      const response = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ScreenshotValidator/1.0)'
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  _analyzeScreenshotPatterns(appData) {
    const issues = [];
    let confidence = 1.0;

    const screenshots = appData.screenshots || [];
    const ipadScreenshots = appData.ipadScreenshots || [];

    // Pattern 1: Detect suspiciously old screenshot URLs (might indicate stale cache)
    const hasOldPatterns = [...screenshots, ...ipadScreenshots].some(url => {
      return url && (
        url.includes('_old') ||
        url.includes('_archived') ||
        url.includes('_legacy') ||
        // Check for very old URL patterns that might indicate cached data
        url.match(/\/\d{4}\/\d{2}\//) // Date patterns in URLs
      );
    });

    if (hasOldPatterns) {
      issues.push('potentially_stale_urls');
      confidence *= 0.5;
    }

    // Pattern 2: Detect obvious content mismatches (like Mastodon screenshots for Threads)
    const contentMismatches = this._detectContentMismatches(appData, screenshots, ipadScreenshots);
    if (contentMismatches.length > 0) {
      issues.push(...contentMismatches);
      confidence *= 0.2;
    }

    // Pattern 3: Detect excessive duplicates (indicates deduplication failure)
    const duplicateIssues = this._detectExcessiveDuplicates(screenshots, ipadScreenshots);
    if (duplicateIssues.length > 0) {
      issues.push(...duplicateIssues);
      confidence *= 0.6;
    }

    return { issues, confidence };
  }

  _detectContentMismatches(appData, screenshots, ipadScreenshots) {
    const issues = [];
    const appTitle = (appData.title || '').toLowerCase();
    const developer = (appData.developer || '').toLowerCase();

    // Known problematic patterns for specific apps
    const knownMismatches = [
      {
        appId: '6446901002', // Threads
        problemPatterns: ['mastodon', 'toot', 'fediverse'],
        description: 'threads_mastodon_mismatch'
      }
    ];

    const allUrls = [...screenshots, ...ipadScreenshots];
    
    knownMismatches.forEach(mismatch => {
      if (appData.id && appData.id.toString() === mismatch.appId) {
        const hasProblemPattern = allUrls.some(url => 
          mismatch.problemPatterns.some(pattern => 
            url && url.toLowerCase().includes(pattern)
          )
        );
        
        if (hasProblemPattern) {
          issues.push(mismatch.description);
        }
      }
    });

    return issues;
  }

  _detectExcessiveDuplicates(screenshots, ipadScreenshots) {
    const issues = [];

    // Analyze iPhone screenshots for duplicates
    const iphoneDuplicates = this._countVisualDuplicates(screenshots);
    if (iphoneDuplicates > screenshots.length * 0.4) { // More than 40% duplicates
      issues.push('excessive_iphone_duplicates');
    }

    // Analyze iPad screenshots for duplicates  
    const ipadDuplicates = this._countVisualDuplicates(ipadScreenshots);
    if (ipadDuplicates > ipadScreenshots.length * 0.4) { // More than 40% duplicates
      issues.push('excessive_ipad_duplicates');
    }

    return issues;
  }

  _countVisualDuplicates(urls) {
    if (!urls || urls.length === 0) return 0;

    const seen = new Set();
    let duplicates = 0;

    urls.forEach(url => {
      if (!url) return;

      // Extract visual identifier from URL
      const identifier = this._extractVisualIdentifier(url);
      
      if (seen.has(identifier)) {
        duplicates++;
      } else {
        seen.add(identifier);
      }
    });

    return duplicates;
  }

  _extractVisualIdentifier(url) {
    // Remove size variations and extract core content identifier
    let identifier = url;

    // Remove size parameters
    identifier = identifier.replace(/\d+x\d+[^/]*/, '');
    
    // Remove common variations
    identifier = identifier.replace(/_new|_orig|_retry|_thumb/, '');
    
    // Extract filename without extension and size info
    const filename = identifier.split('/').pop();
    return filename ? filename.split('.')[0] : identifier;
  }

  async _validateScreenshotUrls(appData) {
    const issues = [];
    let confidence = 1.0;

    const allUrls = [
      ...(appData.screenshots || []),
      ...(appData.ipadScreenshots || [])
    ];

    if (allUrls.length === 0) {
      issues.push('no_screenshots');
      confidence = 0.3;
      return { issues, confidence };
    }

    // Sample a few URLs to check accessibility (don't check all to avoid rate limits)
    const sampleSize = Math.min(3, allUrls.length);
    const sampleUrls = allUrls.slice(0, sampleSize);

    let accessibleCount = 0;
    
    for (const url of sampleUrls) {
      try {
        const response = await axios.head(url, {
          timeout: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ScreenshotValidator/1.0)'
          }
        });
        
        if (response.status === 200) {
          accessibleCount++;
        }
      } catch (error) {
        debug('Screenshot URL not accessible: %s', url);
      }
    }

    const accessibilityRatio = accessibleCount / sampleSize;
    if (accessibilityRatio < 0.5) {
      issues.push('screenshots_not_accessible');
      confidence *= 0.3;
    } else if (accessibilityRatio < 0.8) {
      issues.push('some_screenshots_inaccessible');
      confidence *= 0.7;
    }

    return { issues, confidence };
  }

  _generateRecommendations(issues, confidence) {
    const recommendations = [];

    if (confidence < 0.3) {
      recommendations.push('force_refresh');
    } else if (confidence < 0.7) {
      recommendations.push('clear_cache');
    }

    if (issues.includes('excessive_iphone_duplicates') || issues.includes('excessive_ipad_duplicates')) {
      recommendations.push('rerun_deduplication');
    }

    if (issues.includes('threads_mastodon_mismatch')) {
      recommendations.push('force_web_scraping');
    }

    if (issues.includes('screenshots_not_accessible')) {
      recommendations.push('refresh_screenshot_urls');
    }

    if (recommendations.length === 0 && issues.length > 0) {
      recommendations.push('manual_review');
    }

    return recommendations;
  }

  clearCache() {
    this.validationCache.clear();
    debug('Validation cache cleared');
  }
}

module.exports = { ScreenshotValidator };