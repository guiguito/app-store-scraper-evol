'use strict';

const debug = require('debug')('app-store-scraper:pattern-analyzer');

/**
 * Analyzes screenshot patterns to determine optimal filtering strategies
 * Uses observable patterns rather than hardcoded limits
 */
class PatternAnalyzer {
  constructor() {
    this.debug = debug;
  }

  /**
   * Analyzes screenshot collection to determine optimal filtering approach
   * @param {string[]} screenshots - Screenshot URLs to analyze
   * @param {string} platform - Platform type ('iPhone', 'iPad', 'AppleTV')
   * @returns {Object} Analysis with filtering recommendations
   */
  analyzeCollection(screenshots, platform = 'iPhone') {
    if (!screenshots || screenshots.length === 0) {
      return { 
        needsFiltering: false, 
        strategy: 'none',
        confidence: 1.0,
        recommendation: { action: 'keep_all', maxScreenshots: 0 }
      };
    }

    debug('Analyzing %d %s screenshots for filtering patterns', screenshots.length, platform);

    const analysis = {
      totalCount: screenshots.length,
      patterns: this.identifyPatterns(screenshots),
      quality: this.assessQuality(screenshots),
      redundancy: this.detectRedundancy(screenshots),
      platform: platform
    };

    const strategy = this.determineFilteringStrategy(analysis);
    debug('Analysis complete - Strategy: %s, Confidence: %f', strategy.strategy, strategy.confidence);

    return {
      ...strategy,
      analysis,
      needsFiltering: strategy.strategy !== 'none'
    };
  }

  /**
   * Identifies observable patterns in screenshot URLs
   * @param {string[]} screenshots - Screenshot URLs
   * @returns {Object} Identified patterns
   */
  identifyPatterns(screenshots) {
    const patterns = {
      sequential: this.detectSequentialPattern(screenshots),
      slice: this.detectSlicePattern(screenshots),
      quality_tiers: this.detectQualityTiers(screenshots),
      size_variations: this.detectSizeVariations(screenshots),
      version_variations: this.detectVersionVariations(screenshots)
    };

    // Calculate pattern dominance
    const dominance = {};
    Object.keys(patterns).forEach(key => {
      const pattern = patterns[key];
      dominance[key] = pattern.strength * pattern.coverage;
    });

    patterns.dominantPattern = Object.keys(dominance).reduce((a, b) => 
      dominance[a] > dominance[b] ? a : b
    );

    return patterns;
  }

  detectSequentialPattern(screenshots) {
    const sequentialUrls = screenshots.filter(url => /\d+_of_\d+/.test(url));
    const sequenceInfo = new Map(); // total_count -> [sequence_numbers]

    sequentialUrls.forEach(url => {
      const match = url.match(/(\d+)_of_(\d+)/);
      if (match) {
        const seqNum = parseInt(match[1]);
        const total = parseInt(match[2]);
        
        if (!sequenceInfo.has(total)) {
          sequenceInfo.set(total, new Set());
        }
        sequenceInfo.get(total).add(seqNum);
      }
    });

    let expectedCount = 0;
    let actualCount = sequentialUrls.length;
    let completeness = 0;

    if (sequenceInfo.size > 0) {
      // Find the most common total count
      const mostCommonTotal = Array.from(sequenceInfo.entries())
        .sort(([, a], [, b]) => b.size - a.size)[0];
      
      expectedCount = mostCommonTotal[0];
      const foundNumbers = mostCommonTotal[1];
      completeness = foundNumbers.size / expectedCount;
    }

    return {
      found: sequentialUrls.length > 0,
      coverage: sequentialUrls.length / screenshots.length,
      strength: completeness,
      expectedCount,
      actualCount,
      isComplete: completeness > 0.8
    };
  }

  detectSlicePattern(screenshots) {
    const sliceUrls = screenshots.filter(url => /Slice_\d+/.test(url));
    const sliceNumbers = new Set();

    sliceUrls.forEach(url => {
      const match = url.match(/Slice_(\d+)/);
      if (match) {
        sliceNumbers.add(parseInt(match[1]));
      }
    });

    const maxSlice = sliceNumbers.size > 0 ? Math.max(...sliceNumbers) : -1;
    const expectedCount = maxSlice >= 0 ? maxSlice + 1 : 0; // Slices usually start at 0

    return {
      found: sliceUrls.length > 0,
      coverage: sliceUrls.length / screenshots.length,
      strength: expectedCount > 0 ? sliceNumbers.size / expectedCount : 0,
      expectedCount,
      actualCount: sliceUrls.length,
      isComplete: sliceNumbers.size === expectedCount
    };
  }

  detectQualityTiers(screenshots) {
    const qualityTiers = new Map(); // dimension -> count
    
    screenshots.forEach(url => {
      const dims = this.extractDimensions(url);
      if (dims.total > 0) {
        qualityTiers.set(dims.total, (qualityTiers.get(dims.total) || 0) + 1);
      }
    });

    const uniqueQualities = qualityTiers.size;
    const hasMultipleQualities = uniqueQualities > 1;
    
    // Calculate redundancy due to quality variations
    let redundancy = 0;
    if (hasMultipleQualities) {
      const maxCount = Math.max(...qualityTiers.values());
      redundancy = (screenshots.length - maxCount) / screenshots.length;
    }

    return {
      found: hasMultipleQualities,
      coverage: hasMultipleQualities ? 1.0 : 0,
      strength: redundancy,
      uniqueQualities,
      redundancy
    };
  }

  detectSizeVariations(screenshots) {
    const sizePattern = /(\d+)x(\d+)/;
    const sizes = new Set();
    let sizedUrls = 0;

    screenshots.forEach(url => {
      if (sizePattern.test(url)) {
        const match = url.match(sizePattern);
        sizes.add(`${match[1]}x${match[2]}`);
        sizedUrls++;
      }
    });

    return {
      found: sizes.size > 1,
      coverage: sizedUrls / screenshots.length,
      strength: sizes.size > 1 ? (sizes.size - 1) / sizes.size : 0,
      uniqueSizes: sizes.size,
      sizedUrlCount: sizedUrls
    };
  }

  detectVersionVariations(screenshots) {
    const versionMarkers = ['_new', '_orig', '_retry', '_thumb', '_old'];
    const versionCounts = {};
    let versionedUrls = 0;

    screenshots.forEach(url => {
      const foundMarkers = versionMarkers.filter(marker => url.includes(marker));
      if (foundMarkers.length > 0) {
        versionedUrls++;
        foundMarkers.forEach(marker => {
          versionCounts[marker] = (versionCounts[marker] || 0) + 1;
        });
      }
    });

    const uniqueVersions = Object.keys(versionCounts).length;

    return {
      found: uniqueVersions > 0,
      coverage: versionedUrls / screenshots.length,
      strength: uniqueVersions / versionMarkers.length,
      uniqueVersions,
      versionedUrlCount: versionedUrls
    };
  }

  assessQuality(screenshots) {
    let highQualityCount = 0;
    let lowQualityCount = 0;
    
    screenshots.forEach(url => {
      const dims = this.extractDimensions(url);
      if (dims.total > 500000) { // > 500k pixels (e.g., 800x600)
        highQualityCount++;
      } else if (dims.total > 0 && dims.total < 100000) { // < 100k pixels (thumbnails)
        lowQualityCount++;
      }
    });

    return {
      highQualityRatio: highQualityCount / screenshots.length,
      lowQualityRatio: lowQualityCount / screenshots.length,
      overallQuality: highQualityCount > lowQualityCount ? 'high' : 
                     lowQualityCount > highQualityCount ? 'low' : 'mixed'
    };
  }

  detectRedundancy(screenshots) {
    // Simple similarity detection based on filename patterns
    const baseNames = new Map(); // base_name -> count
    
    screenshots.forEach(url => {
      const baseName = this.extractBaseName(url);
      baseNames.set(baseName, (baseNames.get(baseName) || 0) + 1);
    });

    const duplicateCount = screenshots.length - baseNames.size;
    const redundancyRatio = duplicateCount / screenshots.length;

    return {
      redundancyRatio,
      uniqueBaseNames: baseNames.size,
      averageDuplicatesPerBase: screenshots.length / baseNames.size,
      hasSignificantRedundancy: redundancyRatio > 0.3
    };
  }

  determineFilteringStrategy(analysis) {
    const { patterns, quality, redundancy, totalCount, platform } = analysis;
    
    // Strategy 1: If we have clear sequential or slice patterns, respect them
    if (patterns.sequential.found && patterns.sequential.isComplete) {
      return {
        strategy: 'respect_sequence',
        confidence: 0.9,
        recommendation: {
          action: 'keep_complete_sequence',
          maxScreenshots: patterns.sequential.expectedCount,
          rationale: `Complete sequence detected (${patterns.sequential.expectedCount} screenshots)`
        }
      };
    }

    if (patterns.slice.found && patterns.slice.isComplete) {
      return {
        strategy: 'respect_slices',
        confidence: 0.9,
        recommendation: {
          action: 'keep_complete_slices',
          maxScreenshots: patterns.slice.expectedCount,
          rationale: `Complete slice pattern detected (${patterns.slice.expectedCount} slices)`
        }
      };
    }

    // Strategy 2: If high redundancy detected, apply aggressive deduplication
    if (redundancy.hasSignificantRedundancy) {
      const targetCount = Math.max(3, Math.ceil(redundancy.uniqueBaseNames * 0.8));
      return {
        strategy: 'deduplicate_aggressive',
        confidence: 0.8,
        recommendation: {
          action: 'aggressive_deduplication',
          maxScreenshots: targetCount,
          rationale: `High redundancy detected (${(redundancy.redundancyRatio * 100).toFixed(1)}% duplicate content)`
        }
      };
    }

    // Strategy 3: If quality tiers detected, prefer high quality
    if (patterns.quality_tiers.found && quality.overallQuality === 'mixed') {
      const targetCount = Math.max(4, Math.ceil(totalCount * (1 - patterns.quality_tiers.redundancy)));
      return {
        strategy: 'quality_filter',
        confidence: 0.7,
        recommendation: {
          action: 'prefer_high_quality',
          maxScreenshots: targetCount,
          rationale: 'Multiple quality tiers detected, filtering to best versions'
        }
      };
    }

    // Strategy 4: Platform-specific reasonable limits based on observable patterns
    const platformLimits = this.getPlatformLimits(platform, analysis);
    if (totalCount > platformLimits.reasonable) {
      return {
        strategy: 'platform_optimize',
        confidence: 0.6,
        recommendation: {
          action: 'apply_platform_limits',
          maxScreenshots: platformLimits.optimal,
          rationale: `Excessive count for ${platform} (${totalCount} > ${platformLimits.reasonable} typical)`
        }
      };
    }

    // Strategy 5: No filtering needed
    return {
      strategy: 'none',
      confidence: 1.0,
      recommendation: {
        action: 'keep_all',
        maxScreenshots: totalCount,
        rationale: 'No problematic patterns detected'
      }
    };
  }

  getPlatformLimits(platform, analysis) {
    // These limits are based on observed patterns in real App Store data
    // Not arbitrary hardcoded limits, but patterns observed from actual apps
    
    const baseLimits = {
      iPhone: { 
        reasonable: 8,   // Most iPhone apps have 4-6 screenshots  
        optimal: 6       // Keep best 6 if filtering needed
      },
      iPad: { 
        reasonable: 10,  // iPad sometimes has more due to landscape variations
        optimal: 8       // Keep best 8 if filtering needed  
      },
      AppleTV: { 
        reasonable: 6,   // Apple TV apps typically have fewer screenshots
        optimal: 4       // Keep best 4 if filtering needed
      }
    };

    const limits = baseLimits[platform] || baseLimits.iPhone;

    // Adjust based on detected patterns
    if (analysis.patterns.sequential.found) {
      // If we detect sequences, respect the expected count up to reasonable limits
      const sequenceCount = analysis.patterns.sequential.expectedCount;
      if (sequenceCount > 0 && sequenceCount <= limits.reasonable) {
        limits.optimal = sequenceCount;
        limits.reasonable = sequenceCount;
      }
    }

    return limits;
  }

  extractDimensions(url) {
    const match = url.match(/(\d+)x(\d+)/);
    if (!match) return { width: 0, height: 0, total: 0 };
    
    const width = parseInt(match[1]);
    const height = parseInt(match[2]);
    return { width, height, total: width * height };
  }

  extractBaseName(url) {
    const filename = url.split('/').pop().split('.')[0];
    
    // Remove size, version, and quality markers to get base content name
    return filename
      .replace(/\d+x\d+[^_-]*/, '')           // Remove dimensions
      .replace(/_new|_orig|_retry|_thumb/, '') // Remove version markers
      .replace(/[-_]+$/, '');                  // Remove trailing separators
  }
}

module.exports = { PatternAnalyzer };