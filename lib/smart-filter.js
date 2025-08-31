'use strict';

const debug = require('debug')('app-store-scraper:smart-filter');
const { PatternAnalyzer } = require('./pattern-analyzer');

/**
 * Smart screenshot filtering based on observable patterns
 * Applies filtering strategies based on detected patterns rather than hardcoded rules
 */
class SmartFilter {
  constructor() {
    this.analyzer = new PatternAnalyzer();
    this.debug = debug;
  }

  /**
   * Applies intelligent filtering to screenshot collection
   * @param {string[]} screenshots - Screenshots to filter
   * @param {string} platform - Platform type ('iPhone', 'iPad', 'AppleTV')
   * @returns {string[]} Filtered screenshots
   */
  filter(screenshots, platform = 'iPhone') {
    if (!screenshots || screenshots.length === 0) {
      return [];
    }

    debug('Smart filtering %d %s screenshots', screenshots.length, platform);

    // Analyze the collection to determine filtering strategy
    const analysis = this.analyzer.analyzeCollection(screenshots, platform);
    
    if (!analysis.needsFiltering) {
      debug('No filtering needed - keeping all %d screenshots', screenshots.length);
      return screenshots;
    }

    debug('Applying %s strategy: %s', analysis.strategy, analysis.recommendation.rationale);

    // Apply the recommended filtering strategy
    const filtered = this.applyStrategy(screenshots, analysis);
    
    debug('Filtered from %d to %d screenshots using %s strategy', 
          screenshots.length, filtered.length, analysis.strategy);

    return filtered;
  }

  /**
   * Applies the specific filtering strategy determined by pattern analysis
   * @param {string[]} screenshots - Screenshots to filter
   * @param {Object} analysis - Analysis results with strategy recommendation
   * @returns {string[]} Filtered screenshots
   */
  applyStrategy(screenshots, analysis) {
    switch (analysis.strategy) {
      case 'respect_sequence':
        return this.respectSequentialPattern(screenshots, analysis);
        
      case 'respect_slices':
        return this.respectSlicePattern(screenshots, analysis);
        
      case 'deduplicate_aggressive':
        return this.aggressiveDeduplicate(screenshots, analysis);
        
      case 'quality_filter':
        return this.filterByQuality(screenshots, analysis);
        
      case 'platform_optimize':
        return this.platformOptimize(screenshots, analysis);
        
      default:
        return screenshots;
    }
  }

  respectSequentialPattern(screenshots, analysis) {
    // Keep only URLs that are part of the complete sequence
    const expectedCount = analysis.recommendation.maxScreenshots;
    const sequentialUrls = new Map(); // sequence_num -> url
    
    screenshots.forEach(url => {
      const match = url.match(/(\d+)_of_(\d+)/);
      if (match) {
        const seqNum = parseInt(match[1]);
        const total = parseInt(match[2]);
        
        if (total === expectedCount && seqNum >= 1 && seqNum <= expectedCount) {
          // If multiple URLs for same sequence number, keep the best one
          const existing = sequentialUrls.get(seqNum);
          if (!existing || this.isBetterUrl(url, existing)) {
            sequentialUrls.set(seqNum, url);
          }
        }
      }
    });

    // Return in sequence order
    const result = [];
    for (let i = 1; i <= expectedCount; i++) {
      if (sequentialUrls.has(i)) {
        result.push(sequentialUrls.get(i));
      }
    }

    debug('Respected sequence pattern: kept %d/%d expected screenshots', 
          result.length, expectedCount);

    return result;
  }

  respectSlicePattern(screenshots, analysis) {
    // Keep only URLs that are part of the complete slice set
    const expectedCount = analysis.recommendation.maxScreenshots;
    const sliceUrls = new Map(); // slice_num -> url
    
    screenshots.forEach(url => {
      const match = url.match(/Slice_(\d+)/);
      if (match) {
        const sliceNum = parseInt(match[1]);
        
        if (sliceNum >= 0 && sliceNum < expectedCount) {
          // If multiple URLs for same slice number, keep the best one
          const existing = sliceUrls.get(sliceNum);
          if (!existing || this.isBetterUrl(url, existing)) {
            sliceUrls.set(sliceNum, url);
          }
        }
      }
    });

    // Return in slice order (0, 1, 2, ...)
    const result = [];
    for (let i = 0; i < expectedCount; i++) {
      if (sliceUrls.has(i)) {
        result.push(sliceUrls.get(i));
      }
    }

    debug('Respected slice pattern: kept %d/%d expected slices', 
          result.length, expectedCount);

    return result;
  }

  aggressiveDeduplicate(screenshots, analysis) {
    const targetCount = analysis.recommendation.maxScreenshots;
    const groups = new Map(); // base_name -> [urls]
    
    // Group by base content identifier
    screenshots.forEach(url => {
      const baseName = this.extractContentIdentifier(url);
      if (!groups.has(baseName)) {
        groups.set(baseName, []);
      }
      groups.get(baseName).push(url);
    });

    // Sort groups by quality/relevance and take best from each
    const sortedGroups = Array.from(groups.entries())
      .sort(([, a], [, b]) => {
        // Prefer groups with better quality indicators
        const aQuality = this.assessGroupQuality(a);
        const bQuality = this.assessGroupQuality(b);
        return bQuality - aQuality;
      });

    const result = [];
    for (const [baseName, urls] of sortedGroups) {
      if (result.length >= targetCount) break;
      
      // Select best URL from this group
      const bestUrl = this.selectBestFromGroup(urls);
      result.push(bestUrl);
    }

    debug('Aggressive deduplication: %d groups -> %d screenshots', 
          groups.size, result.length);

    return result;
  }

  filterByQuality(screenshots, analysis) {
    const targetCount = analysis.recommendation.maxScreenshots;
    
    // Score each screenshot by quality indicators
    const scoredScreenshots = screenshots.map(url => ({
      url,
      quality: this.calculateQualityScore(url)
    }));

    // Sort by quality (best first) and take top ones
    const result = scoredScreenshots
      .sort((a, b) => b.quality - a.quality)
      .slice(0, targetCount)
      .map(item => item.url);

    debug('Quality filtering: kept %d highest quality screenshots', result.length);

    return result;
  }

  platformOptimize(screenshots, analysis) {
    const targetCount = analysis.recommendation.maxScreenshots;
    
    // For platform optimization, we want to keep a diverse set of the best screenshots
    const diverseScreenshots = this.selectDiverseSet(screenshots, targetCount);
    
    debug('Platform optimization: selected %d diverse screenshots', diverseScreenshots.length);

    return diverseScreenshots;
  }

  selectDiverseSet(screenshots, targetCount) {
    if (screenshots.length <= targetCount) {
      return screenshots;
    }

    // Group screenshots by similarity and select representatives
    const groups = this.groupBySimilarity(screenshots);
    
    // Calculate how many to take from each group
    const groupSizes = Array.from(groups.values()).map(group => group.length);
    const totalSize = groupSizes.reduce((sum, size) => sum + size, 0);
    
    const result = [];
    let remaining = targetCount;

    groups.forEach((urls, groupKey) => {
      if (remaining <= 0) return;
      
      // Determine how many to take from this group (proportional)
      const groupProportion = urls.length / totalSize;
      const groupTarget = Math.max(1, Math.round(targetCount * groupProportion));
      const takeCount = Math.min(groupTarget, remaining, urls.length);
      
      // Select best URLs from this group
      const groupResult = this.selectBestFromGroup(urls).slice(0, takeCount);
      result.push(...groupResult);
      remaining -= takeCount;
    });

    return result.slice(0, targetCount);
  }

  groupBySimilarity(screenshots) {
    const groups = new Map();
    
    screenshots.forEach(url => {
      const similarity = this.calculateSimilarityKey(url);
      if (!groups.has(similarity)) {
        groups.set(similarity, []);
      }
      groups.get(similarity).push(url);
    });

    return groups;
  }

  calculateSimilarityKey(url) {
    // Create a similarity key based on observable features
    const dims = this.extractDimensions(url);
    const aspectRatio = dims.width > 0 ? Math.round((dims.height / dims.width) * 10) : 0;
    const hasSequence = /\d+_of_\d+/.test(url);
    const hasSlice = /Slice_\d+/.test(url);
    
    return `${aspectRatio}_${hasSequence}_${hasSlice}`;
  }

  selectBestFromGroup(urls) {
    if (urls.length === 1) return urls;
    
    return urls.sort((a, b) => {
      const scoreA = this.calculateQualityScore(a);
      const scoreB = this.calculateQualityScore(b);
      return scoreB - scoreA;
    });
  }

  calculateQualityScore(url) {
    let score = 0;
    
    // Dimension-based scoring
    const dims = this.extractDimensions(url);
    if (dims.total > 0) {
      score += Math.min(dims.total / 100000, 10); // Max 10 points for dimensions
    }

    // Version preference scoring  
    if (url.includes('_new')) score += 5;
    if (url.includes('_orig') || url.includes('_retry')) score -= 3;
    if (url.includes('_thumb')) score -= 5;

    // Format preference scoring
    if (url.includes('.jpg')) score += 1; // Prefer JPG over PNG for photos
    if (url.includes('.png') && dims.total < 200000) score += 2; // PNG good for UI screenshots
    
    // Avoid thumbnails
    if (url.includes('300x0w')) score -= 3;

    return score;
  }

  assessGroupQuality(urls) {
    const avgScore = urls.reduce((sum, url) => sum + this.calculateQualityScore(url), 0) / urls.length;
    return avgScore;
  }

  isBetterUrl(urlA, urlB) {
    return this.calculateQualityScore(urlA) > this.calculateQualityScore(urlB);
  }

  extractDimensions(url) {
    const match = url.match(/(\d+)x(\d+)/);
    if (!match) return { width: 0, height: 0, total: 0 };
    
    const width = parseInt(match[1]);
    const height = parseInt(match[2]);
    return { width, height, total: width * height };
  }

  extractContentIdentifier(url) {
    const filename = url.split('/').pop().split('.')[0];
    
    // Remove variations to get core content identifier
    return filename
      .replace(/\d+x\d+[^_-]*/, '')           // Remove dimensions
      .replace(/_new|_orig|_retry|_thumb/, '') // Remove version markers  
      .replace(/[-_]+$/, '');                  // Remove trailing separators
  }
}

module.exports = { SmartFilter };