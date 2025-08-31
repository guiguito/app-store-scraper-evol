'use strict';

const debug = require('debug')('app-store-scraper:content-deduplicator');

/**
 * Advanced content-based screenshot deduplication
 * Uses observable patterns rather than hardcoded limits to identify unique content
 */
class ContentDeduplicator {
  constructor() {
    this.debug = debug;
  }

  /**
   * Deduplicates screenshots based on content analysis and observable patterns
   * @param {string[]} screenshots - Array of screenshot URLs
   * @param {string} platform - Platform type ('iPhone', 'iPad', 'AppleTV')
   * @returns {string[]} Deduplicated screenshots representing unique content
   */
  deduplicate(screenshots, platform = 'iPhone') {
    if (!screenshots || screenshots.length === 0) {
      return [];
    }

    debug('Deduplicating %d %s screenshots', screenshots.length, platform);

    // Step 1: Analyze the URL structure to understand the naming patterns
    const analysis = this.analyzeUrlPatterns(screenshots);
    debug('Pattern analysis: %o', analysis);

    // Step 2: Group URLs by content identity using observed patterns
    const contentGroups = this.groupByContent(screenshots, analysis);
    debug('Found %d unique content groups from %d URLs', contentGroups.size, screenshots.length);

    // Step 3: Select best representative from each group
    const deduplicated = this.selectBestRepresentatives(contentGroups, platform);
    debug('Selected %d representatives after deduplication', deduplicated.length);

    return deduplicated;
  }

  /**
   * Analyzes URL patterns to identify the content identification scheme
   * @param {string[]} urls - Screenshot URLs to analyze
   * @returns {Object} Pattern analysis results
   */
  analyzeUrlPatterns(urls) {
    const analysis = {
      totalUrls: urls.length,
      patterns: {
        sequential: { found: false, pattern: null, count: 0 }, // 1_of_5, 2_of_5, etc.
        slice: { found: false, pattern: null, count: 0 },      // Slice_0, Slice_1, etc.
        hash: { found: false, pattern: null, count: 0 },       // UUID/hash based
        numbered: { found: false, pattern: null, count: 0 },   // -1, -2, -3, etc.
        themed: { found: false, pattern: null, count: 0 }      // Different themes/variations
      },
      dominantPattern: null,
      expectedUniqueCount: 0
    };

    urls.forEach(url => {
      if (!url) return;

      // Check for sequential patterns (X_of_Y)
      const sequentialMatch = url.match(/(\d+)_of_(\d+)/);
      if (sequentialMatch) {
        analysis.patterns.sequential.found = true;
        analysis.patterns.sequential.count++;
        const total = parseInt(sequentialMatch[2]);
        analysis.expectedUniqueCount = Math.max(analysis.expectedUniqueCount, total);
      }

      // Check for slice patterns (Slice_X)
      const sliceMatch = url.match(/Slice_(\d+)/);
      if (sliceMatch) {
        analysis.patterns.slice.found = true;
        analysis.patterns.slice.count++;
        const sliceNum = parseInt(sliceMatch[1]);
        analysis.expectedUniqueCount = Math.max(analysis.expectedUniqueCount, sliceNum + 1);
      }

      // Check for numbered suffixes (-1, -2, etc.)
      const numberedMatch = url.match(/[/-](\d+)[^/]*\.[^/]*$/);
      if (numberedMatch && !sequentialMatch && !sliceMatch) {
        analysis.patterns.numbered.found = true;
        analysis.patterns.numbered.count++;
        const num = parseInt(numberedMatch[1]);
        analysis.expectedUniqueCount = Math.max(analysis.expectedUniqueCount, num);
      }

      // Check for hash/UUID patterns
      const hashMatch = url.match(/[a-f0-9-]{16,}/);
      if (hashMatch) {
        analysis.patterns.hash.found = true;
        analysis.patterns.hash.count++;
      }
    });

    // Determine dominant pattern
    const patternCounts = Object.entries(analysis.patterns)
      .filter(([_, data]) => data.found)
      .map(([name, data]) => ({ name, count: data.count }))
      .sort((a, b) => b.count - a.count);

    analysis.dominantPattern = patternCounts.length > 0 ? patternCounts[0].name : 'unknown';

    // If no clear expected count, estimate based on analysis
    if (analysis.expectedUniqueCount === 0) {
      // Use observable patterns to estimate reasonable unique count
      if (analysis.patterns.hash.found) {
        // Hash-based usually means each URL is unique content
        analysis.expectedUniqueCount = Math.ceil(urls.length / 2); // Assume some variations
      } else {
        // Default heuristic: assume 4-6 unique screenshots is typical
        analysis.expectedUniqueCount = Math.min(6, Math.ceil(urls.length / 3));
      }
    }

    return analysis;
  }

  /**
   * Groups URLs by their content identity using pattern analysis
   * @param {string[]} urls - URLs to group
   * @param {Object} analysis - Pattern analysis results
   * @returns {Map} Map of content ID -> array of URLs
   */
  groupByContent(urls, analysis) {
    const groups = new Map();

    urls.forEach(url => {
      if (!url) return;

      const contentId = this.extractContentId(url, analysis);
      
      if (!groups.has(contentId)) {
        groups.set(contentId, []);
      }
      groups.get(contentId).push(url);
    });

    return groups;
  }

  /**
   * Extracts content identifier from URL based on detected patterns
   * @param {string} url - Screenshot URL
   * @param {Object} analysis - Pattern analysis
   * @returns {string} Content identifier
   */
  extractContentId(url, analysis) {
    // Use the dominant pattern to extract content ID
    switch (analysis.dominantPattern) {
      case 'sequential':
        const seqMatch = url.match(/(\d+)_of_\d+/);
        return seqMatch ? `seq_${seqMatch[1]}` : this.fallbackId(url);

      case 'slice':
        const sliceMatch = url.match(/Slice_(\d+)/);
        return sliceMatch ? `slice_${sliceMatch[1]}` : this.fallbackId(url);

      case 'numbered':
        const numMatch = url.match(/[/-](\d+)[^/]*\.[^/]*$/);
        return numMatch ? `num_${numMatch[1]}` : this.fallbackId(url);

      case 'hash':
        // For hash-based, extract the hash as content ID
        const hashMatch = url.match(/([a-f0-9-]{16,})/);
        return hashMatch ? `hash_${hashMatch[1].substring(0, 16)}` : this.fallbackId(url);

      default:
        return this.fallbackId(url);
    }
  }

  /**
   * Fallback content ID extraction when no clear pattern is found
   * @param {string} url - Screenshot URL
   * @returns {string} Fallback content identifier
   */
  fallbackId(url) {
    // Extract filename without size variations and extensions
    const filename = url.split('/').pop().split('.')[0];
    
    // Remove size parameters and common variations
    let cleanName = filename
      .replace(/\d+x\d+[^_-]*/, '')           // Remove size specs
      .replace(/_new|_orig|_retry|_thumb/, '') // Remove version suffixes
      .replace(/[-_]+$/, '');                  // Remove trailing separators

    return `fallback_${cleanName}` || `fallback_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Selects the best representative URL from each content group
   * @param {Map} contentGroups - Map of content ID -> URLs
   * @param {string} platform - Platform type
   * @returns {string[]} Best representative URLs
   */
  selectBestRepresentatives(contentGroups, platform) {
    const representatives = [];

    contentGroups.forEach((urls, contentId) => {
      if (urls.length === 1) {
        representatives.push(urls[0]);
        return;
      }

      // Multiple URLs for same content - select best one
      const best = this.selectBestUrl(urls, platform);
      representatives.push(best);
      
      debug('Content "%s": selected best from %d variations', contentId, urls.length);
    });

    // Sort representatives for consistent ordering
    return this.sortRepresentatives(representatives);
  }

  /**
   * Selects the best URL from multiple variations of the same content
   * @param {string[]} urls - URLs representing the same content
   * @param {string} platform - Platform type
   * @returns {string} Best URL
   */
  selectBestUrl(urls, platform) {
    return urls.sort((a, b) => {
      // Priority 1: Prefer "_new" versions over "_orig" or "_retry"
      const aNew = a.includes('_new');
      const bNew = b.includes('_new');
      const aOld = a.includes('_orig') || a.includes('_retry');
      const bOld = b.includes('_orig') || b.includes('_retry');
      
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      if (aOld && !bOld) return 1;
      if (!aOld && bOld) return -1;

      // Priority 2: Prefer higher resolution
      const aDims = this.extractDimensions(a);
      const bDims = this.extractDimensions(b);
      if (aDims !== bDims) return bDims - aDims;

      // Priority 3: Prefer non-thumbnail versions
      const aThumb = a.includes('300x0w') || a.includes('thumb');
      const bThumb = b.includes('300x0w') || b.includes('thumb');
      if (aThumb && !bThumb) return 1;
      if (!aThumb && bThumb) return -1;

      // Priority 4: Platform-specific preferences
      if (platform === 'iPad') {
        // For iPad, prefer standard naming over complex variations
        const aComplexity = (a.match(/_/g) || []).length;
        const bComplexity = (b.match(/_/g) || []).length;
        return aComplexity - bComplexity;
      }

      // Priority 5: Prefer shorter URLs (usually simpler/canonical)
      return a.length - b.length;
    })[0];
  }

  /**
   * Extracts pixel dimensions from URL for quality comparison
   * @param {string} url - Screenshot URL
   * @returns {number} Total pixels (width * height)
   */
  extractDimensions(url) {
    const match = url.match(/(\d+)x(\d+)/);
    return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
  }

  /**
   * Sorts representatives for consistent output ordering
   * @param {string[]} urls - Representative URLs
   * @returns {string[]} Sorted URLs
   */
  sortRepresentatives(urls) {
    return urls.sort((a, b) => {
      // Extract sequence numbers if present
      const aSeq = this.extractSequenceNumber(a);
      const bSeq = this.extractSequenceNumber(b);
      
      if (aSeq !== null && bSeq !== null) {
        return aSeq - bSeq;
      }
      
      // Fall back to alphabetical sorting
      return a.localeCompare(b);
    });
  }

  /**
   * Extracts sequence number from URL for sorting
   * @param {string} url - Screenshot URL
   * @returns {number|null} Sequence number or null
   */
  extractSequenceNumber(url) {
    // Check for X_of_Y pattern
    const seqMatch = url.match(/(\d+)_of_\d+/);
    if (seqMatch) return parseInt(seqMatch[1]);

    // Check for Slice_X pattern
    const sliceMatch = url.match(/Slice_(\d+)/);
    if (sliceMatch) return parseInt(sliceMatch[1]);

    // Check for -X suffix
    const suffixMatch = url.match(/[/-](\d+)[^/]*\.[^/]*$/);
    if (suffixMatch) return parseInt(suffixMatch[1]);

    return null;
  }
}

module.exports = { ContentDeduplicator };