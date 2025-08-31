'use strict';

const axios = require('axios');
const debug = require('debug')('app-store-scraper:screenshot-fallback');
const { ParseError, NetworkError, ErrorHelpers } = require('./errors');

/**
 * Extracts screenshot URLs from App Store webpage when iTunes API returns empty results
 * @param {string} appId - The iTunes app ID
 * @param {string} country - Country code (default: 'us')
 * @returns {Promise<Object>} Object containing screenshots, ipadScreenshots, and appletvScreenshots arrays
 */
async function extractScreenshotsFromWeb(appId, country = 'us') {
  const url = `https://apps.apple.com/${country}/app/id${appId}`;
  debug('Extracting screenshots from web for app %s, country %s', appId, country);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });
    
    const html = response.data;
    debug('Received HTML page, size: %d characters', html.length);
    
    // Extract all mzstatic URLs from the page
    const allMzstaticUrls = html.match(/https:\/\/[^"'\s]*\.mzstatic\.com[^"'\s]*/gi) || [];
    debug('Found %d total mzstatic URLs on page', allMzstaticUrls.length);
    
    // Filter to potential screenshot URLs only (exclude icons, artwork, etc.)
    const potentialScreenshots = allMzstaticUrls.filter(url => {
      return (url.includes('.png') || url.includes('.jpg')) &&
             !url.includes('AppIcon') && 
             !url.includes('artworkUrl') &&
             !url.includes('icon') && 
             !url.includes('logo') &&
             (url.includes('screenshot') || 
              url.includes('ImageGen') ||
              url.includes('_of_') ||
              url.includes('Slice_') ||
              url.includes('1242x2688') ||
              url.includes('2048x2732') ||
              url.match(/\d+x\d+/)); // Has dimensions
    });
    
    debug('Filtered to %d potential screenshots', potentialScreenshots.length);
    
    // Group URLs by pattern to identify the primary screenshot set
    const groupedScreenshots = groupScreenshotsByPattern(potentialScreenshots);
    debug('Grouped into %d screenshot pattern groups', Object.keys(groupedScreenshots).length);
    
    // Select the primary groups for each device type
    const primaryGroups = selectPrimaryScreenshotGroups(groupedScreenshots);
    
    let screenshots = primaryGroups.iphone || [];
    let ipadScreenshots = primaryGroups.ipad || [];
    let appletvScreenshots = primaryGroups.appletv || [];
    
    // Remove basic duplicates and clean URLs
    screenshots = [...new Set(screenshots)].filter(Boolean).map(cleanScreenshotUrl).filter(Boolean);
    ipadScreenshots = [...new Set(ipadScreenshots)].filter(Boolean).map(cleanScreenshotUrl).filter(Boolean);
    appletvScreenshots = [...new Set(appletvScreenshots)].filter(Boolean).map(cleanScreenshotUrl).filter(Boolean);
    
    // Apply basic deduplication to avoid multiple sizes of same image
    screenshots = deduplicateScreenshots(screenshots);
    ipadScreenshots = deduplicateScreenshots(ipadScreenshots);
    appletvScreenshots = deduplicateScreenshots(appletvScreenshots);
    
    // Apply conservative validation - prefer empty results over contaminated ones
    screenshots = applyConservativeValidation(screenshots, 'iphone');
    ipadScreenshots = applyConservativeValidation(ipadScreenshots, 'ipad');
    
    // Apply reasonable limits to prevent over-extraction
    if (screenshots.length > 8) screenshots = screenshots.slice(0, 8);
    if (ipadScreenshots.length > 8) ipadScreenshots = ipadScreenshots.slice(0, 8);
    if (appletvScreenshots.length > 6) appletvScreenshots = appletvScreenshots.slice(0, 6);
    
    debug('Extracted %d iPhone, %d iPad, %d AppleTV screenshots', 
          screenshots.length, ipadScreenshots.length, appletvScreenshots.length);
    
    return {
      screenshots,
      ipadScreenshots,
      appletvScreenshots
    };
    
  } catch (error) {
    debug('Error extracting screenshots from web: %s', error.message);
    
    // Log specific error types for debugging
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      debug('Network error during screenshot extraction: %s', error.message);
    } else if (error.response && error.response.status === 404) {
      debug('App page not found: %s', appId);
    } else if (error.response && error.response.status >= 500) {
      debug('App Store server error during screenshot extraction: %s', error.response.status);
    }
    
    // Return empty arrays if extraction fails - this should not prevent app data retrieval
    return {
      screenshots: [],
      ipadScreenshots: [],
      appletvScreenshots: []
    };
  }
}

/**
 * Cleans and standardizes screenshot URLs while preserving meaningful identifiers
 * CRITICAL: This function preserves the unique path information that identifies different screenshots
 * @param {string} url - Raw screenshot URL
 * @returns {string} Cleaned URL with preserved identifiers
 */
function cleanScreenshotUrl(url) {
  // Remove escape characters
  url = url.replace(/\\/g, '');
  
  // Convert dynamic size placeholders to standard sizes, PRESERVING the unique path
  if (url.includes('{w}x{h}{c}.{f}')) {
    // IMPORTANT: Don't just replace with generic size - this would destroy unique identifiers!
    // The path before the template contains the unique screenshot identifier
    url = url.replace('{w}x{h}{c}.{f}\\', '392x696bb.jpg');
    url = url.replace('{w}x{h}{c}.{f}', '392x696bb.jpg');
  }
  
  // Ensure URL is properly formatted
  if (!url.startsWith('http')) {
    return null;
  }
  
  return url;
}

/**
 * Group screenshot URLs by pattern to identify consistent sets
 * @param {string[]} urls - Array of potential screenshot URLs
 * @returns {Object} Grouped URLs by pattern
 */
function groupScreenshotsByPattern(urls) {
  const groups = {};
  
  urls.forEach(url => {
    // Extract the base pattern (everything before size variations)
    const match = url.match(/\/([a-f0-9-]{36})\/([^\/]+)\.[^\/]+\/[^\/]+$/);
    if (match) {
      const [, uuid, filename] = match;
      const basePattern = `${uuid}/${filename}`;
      
      if (!groups[basePattern]) {
        groups[basePattern] = [];
      }
      groups[basePattern].push(url);
    }
  });
  
  return groups;
}

/**
 * Select primary screenshot groups for each device type
 * @param {Object} groupedScreenshots - Grouped URLs by pattern
 * @returns {Object} Primary groups for each device type
 */
function selectPrimaryScreenshotGroups(groupedScreenshots) {
  const deviceGroups = {
    iphone: [],
    ipad: [],
    appletv: []
  };
  
  // Convert groups to arrays and analyze patterns
  const patternGroups = Object.entries(groupedScreenshots).map(([pattern, urls]) => {
    const sampleUrl = urls[0];
    let deviceType = 'iphone'; // default
    let confidence = 0;
    
    // Determine device type and confidence
    if (sampleUrl.includes('iPad') || sampleUrl.includes('Slice_') || sampleUrl.includes('2048x2732') || sampleUrl.includes('APP_IPAD_PRO')) {
      deviceType = 'ipad';
      confidence += 2;
      
      // Boost confidence for strong iPad indicators
      if (sampleUrl.includes('APP_IPAD_PRO')) confidence += 2;
      if (sampleUrl.includes('iPad13') || sampleUrl.includes('iPad12')) confidence += 2;
    } else if (sampleUrl.includes('appletv') || sampleUrl.includes('AppleTV') || sampleUrl.includes('1920x1080')) {
      deviceType = 'appletv';
      confidence += 2;
    } else if (sampleUrl.includes('1242x2688') || sampleUrl.includes('ImageGen')) {
      deviceType = 'iphone';
      confidence += 2;
    }
    
    // Prefer sequential patterns (1_of_6, 2_of_6, etc.)
    if (pattern.includes('_of_')) {
      confidence += 3;
    }
    
    // Prefer "new" versions over "orig" versions for Threads app
    if (pattern.includes('_new.')) {
      confidence += 1;
    } else if (pattern.includes('_orig.')) {
      confidence -= 1;
    }
    
    // Prefer patterns with "ImageGen" (official screenshots)
    if (pattern.includes('ImageGen')) {
      confidence += 2;
    }
    
    // Penalize single isolated screenshots
    if (urls.length === 1) {
      confidence -= 1;
    }
    
    return {
      pattern,
      urls,
      deviceType,
      confidence,
      count: urls.length
    };
  });
  
  // Group by device type and sort by confidence
  ['iphone', 'ipad', 'appletv'].forEach(deviceType => {
    const devicePatterns = patternGroups
      .filter(group => group.deviceType === deviceType)
      .sort((a, b) => b.confidence - a.confidence || b.count - a.count);
    
    // Take the highest confidence patterns for this device
    let totalScreenshots = 0;
    const maxScreenshots = deviceType === 'iphone' ? 8 : 6;
    
    for (const group of devicePatterns) {
      if (totalScreenshots >= maxScreenshots) break;
      
      // Include confident groups, but allow medium confidence for primary patterns
      const minConfidence = totalScreenshots === 0 ? 1 : 2; // Lower threshold for first group
      if (group.confidence >= minConfidence) {
        // Take only one URL per pattern to avoid size duplicates
        const bestUrl = selectBestQualityUrl(group.urls);
        deviceGroups[deviceType].push(bestUrl);
        totalScreenshots += 1;
      }
    }
  });
  
  // Apply semantic deduplication to remove "new" vs "orig" duplicates
  ['iphone', 'ipad', 'appletv'].forEach(deviceType => {
    deviceGroups[deviceType] = deduplicateSemanticDuplicates(deviceGroups[deviceType]);
  });
  
  return deviceGroups;
}

/**
 * Remove semantic duplicates (like "1_of_6_new" vs "1_of_6_orig")
 * @param {string[]} screenshots - Array of screenshot URLs
 * @returns {string[]} Array with semantic duplicates removed
 */
function deduplicateSemanticDuplicates(screenshots) {
  const seenBasenames = new Set();
  const result = [];
  
  for (const url of screenshots) {
    // Extract the base pattern without version suffix
    const match = url.match(/\/([a-f0-9-]{36})\/([^\/]+)\.[^\/]+\/[^\/]+$/);
    if (match) {
      const [, uuid, filename] = match;
      
      // Create a base pattern by removing version suffixes like "_new", "_orig"
      const basePattern = filename.replace(/_(new|orig|updated|v\d+)$/, '');
      const baseKey = `${basePattern}`;
      
      if (!seenBasenames.has(baseKey)) {
        seenBasenames.add(baseKey);
        result.push(url);
        debug('Including screenshot with base pattern: %s', baseKey);
      } else {
        debug('Skipping semantic duplicate with base pattern: %s', baseKey);
      }
    } else {
      // If we can't parse it, include it to be safe
      result.push(url);
    }
  }
  
  return result;
}

/**
 * Basic deduplication to avoid multiple sizes of same image
 * @param {string[]} screenshots - Array of screenshot URLs
 * @returns {string[]} Deduplicated array
 */
function deduplicateScreenshots(screenshots) {
  const uniqueScreenshots = new Map();
  
  screenshots.forEach(url => {
    if (!url) return;
    
    // Extract the actual image identifier (before size variations)
    // URL format: https://domain.com/.../IMAGE_ID/IMAGE_NAME.jpg/SIZE.jpg
    let baseId = url;
    
    // Extract the unique image path (everything before the final size part)
    const match = url.match(/\/([a-f0-9-]{36})\/([^\/]+)\.[^\/]+\/[^\/]+$/);
    if (match) {
      // Use the UUID + filename as the unique identifier
      baseId = match[1] + '/' + match[2];
    } else {
      // Fallback: try to extract from filename patterns
      const pathParts = url.split('/');
      if (pathParts.length >= 2) {
        const filename = pathParts[pathParts.length - 2]; // Get the actual filename, not the size
        if (filename && filename.includes('.')) {
          baseId = filename.replace(/\.[^.]*$/, ''); // Remove extension
        }
      }
    }
    
    // Keep the first occurrence or prefer higher quality versions
    const existing = uniqueScreenshots.get(baseId);
    if (!existing) {
      uniqueScreenshots.set(baseId, url);
    } else {
      // Prefer URLs that look like they have higher quality (larger dimensions)
      const currentDims = extractDimensions(url);
      const existingDims = extractDimensions(existing);
      if (currentDims.total > existingDims.total) {
        uniqueScreenshots.set(baseId, url);
      }
    }
  });
  
  return Array.from(uniqueScreenshots.values()).filter(Boolean);
}

/**
 * Select the best quality URL from a group of similar screenshots
 * @param {string[]} urls - Array of URLs for the same base screenshot
 * @returns {string} Best quality URL
 */
function selectBestQualityUrl(urls) {
  if (urls.length === 1) return urls[0];
  
  // Prefer higher resolution URLs
  return urls.reduce((best, current) => {
    const bestDims = extractDimensions(best);
    const currentDims = extractDimensions(current);
    return currentDims.total > bestDims.total ? current : best;
  });
}

/**
 * Extract dimensions from URL
 * @param {string} url - Screenshot URL
 * @returns {Object} Dimensions object
 */
function extractDimensions(url) {
  const match = url.match(/(\d+)x(\d+)/);
  if (!match) return { width: 0, height: 0, total: 0 };
  
  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  return { width, height, total: width * height };
}

/**
 * Apply conservative validation to screenshot URLs
 * Prefer empty results over potentially contaminated content
 * @param {string[]} screenshots - Screenshot URLs to validate
 * @param {string} deviceType - Device type (iphone, ipad, appletv)
 * @returns {string[]} Validated screenshots
 */
function applyConservativeValidation(screenshots, deviceType) {
  if (!screenshots || screenshots.length === 0) {
    return [];
  }
  
  // Group screenshots by base pattern to check for consistency
  const patterns = {};
  screenshots.forEach(url => {
    const match = url.match(/\/([a-f0-9-]{36})\/([^\/]+)\.[^\/]+\/[^\/]+$/);
    if (match) {
      const basePattern = `${match[1]}/${match[2]}`;
      if (!patterns[basePattern]) {
        patterns[basePattern] = [];
      }
      patterns[basePattern].push(url);
    }
  });
  
  const patternKeys = Object.keys(patterns);
  debug('Conservative validation for %s: %d screenshots in %d patterns', deviceType, screenshots.length, patternKeys.length);
  
  // If we have too many different patterns, it suggests contamination
  // Be more lenient for iPhone, stricter for iPad
  const maxPatterns = deviceType === 'ipad' ? 6 : 10;
  if (patternKeys.length > maxPatterns) {
    debug('Too many patterns (%d) detected for %s, likely contamination - returning empty', patternKeys.length, deviceType);
    return [];
  }
  
  // For iPad screenshots, be conservative but not overly restrictive
  // Reject contaminated content but accept legitimate iPad screenshots
  if (deviceType === 'ipad') {
    debug('iPad screenshot validation: checking for contamination patterns');
    
    // First check: look for obvious contamination patterns
    const contaminatedUrls = screenshots.filter(url => {
      const urlLower = url.toLowerCase();
      
      // Extract UUID for specific contaminated screenshots we've identified
      const isKnownContaminatedUuid = (
        url.includes('87193092-0ef8-49c2-b620-3655c1aa9a3b') // Known Hive screenshot in Threads
      );
      
      const hasContaminationKeywords = (
        urlLower.includes('_snap_') ||
        urlLower.includes('snapchat') ||
        urlLower.includes('_hive_') ||
        urlLower.includes('mastodon') ||
        urlLower.includes('baseball') ||
        urlLower.includes('mlb') ||
        urlLower.includes('snla') ||
        urlLower.includes('sport') ||
        urlLower.includes('league')
      );
      
      return isKnownContaminatedUuid || hasContaminationKeywords;
    });
    
    if (contaminatedUrls.length > 0) {
      debug('Found %d contaminated iPad screenshots - rejecting all', contaminatedUrls.length);
      return [];
    }
    
    // Second check: validate legitimate iPad screenshots
    const validIpadScreenshots = screenshots.filter(url => {
      const urlLower = url.toLowerCase();
      
      // Count positive iPad indicators
      let indicatorCount = 0;
      
      // Strong indicators
      if (urlLower.includes('ipad_pro') || urlLower.includes('app_ipad_pro')) indicatorCount += 3;
      if (urlLower.includes('ipad13') || urlLower.includes('ipad12')) indicatorCount += 3;
      if (urlLower.includes('imagegen')) indicatorCount += 2;
      if (urlLower.includes('2048x2732')) indicatorCount += 2;
      if (urlLower.includes('display_portrait')) indicatorCount += 2;
      if (urlLower.includes('slice_') && urlLower.includes('ipad')) indicatorCount += 2;
      if (urlLower.includes('3gen_129')) indicatorCount += 2; // iPad Pro 12.9" 3rd gen
      if (urlLower.includes('tablet')) indicatorCount += 1;
      
      // Accept if we have reasonable confidence (2+ indicators)
      return indicatorCount >= 2;
    });
    
    // If we have too many candidates but only a few pass validation, be conservative
    if (screenshots.length > 8 && validIpadScreenshots.length < screenshots.length * 0.7) {
      debug('Too many iPad candidates (%d) with low validation rate (%d/%d) - likely contaminated', 
            screenshots.length, validIpadScreenshots.length, screenshots.length);
      return [];
    }
    
    debug('iPad screenshots validation: %d/%d passed, accepting %d', 
          validIpadScreenshots.length, screenshots.length, validIpadScreenshots.length);
    return validIpadScreenshots;
  }
  
  return screenshots;
}



/**
 * Main function to get screenshots with fallback to web scraping
 * @param {Object} appData - App data from iTunes API
 * @param {string} appId - iTunes app ID
 * @param {string} country - Country code
 * @returns {Promise<Object>} Enhanced app data with screenshots
 */
async function getScreenshotsWithFallback(appData, appId, country = 'us') {
  debug('Getting screenshots with fallback for app %s', appId);
  
  // Check if iTunes API already has screenshots
  const hasIphoneScreenshots = appData.screenshots && appData.screenshots.length > 0;
  const hasIpadScreenshots = appData.ipadScreenshots && appData.ipadScreenshots.length > 0;
  const hasAppleTvScreenshots = appData.appletvScreenshots && appData.appletvScreenshots.length > 0;
  
  // Check what's missing and only scrape for missing platforms
  const needsIphoneScreenshots = !hasIphoneScreenshots;
  const needsIpadScreenshots = !hasIpadScreenshots;
  const needsAppleTvScreenshots = !hasAppleTvScreenshots;
  
  // If we have screenshots for all platforms, return as-is
  if (!needsIphoneScreenshots && !needsIpadScreenshots && !needsAppleTvScreenshots) {
    debug('iTunes API provided all screenshots, no fallback needed');
    return appData;
  }
  
  debug('iTunes API screenshots status - iPhone: %s, iPad: %s, AppleTV: %s. Needs - iPhone: %s, iPad: %s, AppleTV: %s', 
        hasIphoneScreenshots ? 'HAS' : 'MISSING', 
        hasIpadScreenshots ? 'HAS' : 'MISSING', 
        hasAppleTvScreenshots ? 'HAS' : 'MISSING',
        needsIphoneScreenshots, needsIpadScreenshots, needsAppleTvScreenshots);
  
  try {
    const webScreenshots = await extractScreenshotsFromWeb(appId, country);
    
    // Only use web scraping results for missing platforms, preserve existing iTunes API data
    return {
      ...appData,
      screenshots: hasIphoneScreenshots ? appData.screenshots : webScreenshots.screenshots,
      ipadScreenshots: hasIpadScreenshots ? appData.ipadScreenshots : webScreenshots.ipadScreenshots,
      appletvScreenshots: hasAppleTvScreenshots ? appData.appletvScreenshots : webScreenshots.appletvScreenshots
    };
    
  } catch (error) {
    debug('Web fallback failed: %s', error.message);
    // Return original app data if fallback fails
    return appData;
  }
}

module.exports = {
  extractScreenshotsFromWeb,
  getScreenshotsWithFallback
};