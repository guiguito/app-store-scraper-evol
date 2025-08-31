# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Run tests**: `npm test` (uses Mocha with 8000ms timeout)
- **Lint code**: `npm run lint` (uses ESLint with semistandard config)

## Architecture Overview

This is a Node.js scraping library for the iTunes/Mac App Store. The project follows a modular architecture with a clear separation of concerns:

### Core Structure

- **Entry point**: `index.js` - Main module that exports all methods and constants, plus memoization functionality
- **Library modules**: `lib/` directory contains individual scraper implementations:
  - `app.js` - Fetch detailed app information by ID or bundle ID
  - `list.js` - Retrieve app lists from iTunes collections 
  - `search.js` - Search for apps by term
  - `developer.js` - Get apps by developer ID
  - `reviews.js` - Fetch app reviews with pagination
  - `ratings.js` - Get app ratings and histograms
  - `similar.js` - Find "customers also bought" apps
  - `suggest.js` - Get search term suggestions
  - `privacy.js` - Retrieve app privacy information
  - `version-history.js` - Get app version history
  - `constants.js` - App Store collections, categories, countries, and sort options
  - `common.js` - Shared utilities for HTTP requests and parsing

### Key Patterns

- All scraper methods return Promises
- Uses `ramda` for functional programming utilities
- Built-in memoization support via `memoizee` for caching API responses (5min TTL, 1k item limit)
- Request throttling via `axios-rate-limit` to respect rate limits
- HTML parsing with `cheerio`, XML parsing with `xml2js`
- Comprehensive constants for App Store collections, categories, and country markets
- **Hybrid screenshot extraction**: Falls back to web scraping when iTunes API returns empty screenshots

### Testing

- Uses Mocha test framework with Chai assertions
- Tests validate actual API responses against known apps (e.g., Candy Crush Saga)
- Test timeout set to 8 seconds to accommodate network requests
- Tests organized by functionality in `test/lib.*.js` files

### Code Style

- ESLint with semistandard configuration
- ES6+ features (const/let, arrow functions, object shorthand)
- Strict mode enabled
- No unused variables, prefer const, no else-return patterns enforced