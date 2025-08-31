'use strict';

const R = require('ramda');
const common = require('./common');
const app = require('./app');
const c = require('./constants');

function ensureArray (value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function cleanList (results) {
  const reviews = ensureArray(results.feed.entry);
  return reviews.map((review) => ({
    id: review.id.label,
    userName: review.author.name.label,
    userUrl: review.author.uri.label,
    version: review['im:version'].label,
    score: parseInt(review['im:rating'].label),
    title: review.title.label,
    text: review.content.label,
    url: review.link.attributes.href,
    updated: review.updated.label
  }));
}

const reviews = (opts) => new Promise((resolve) => {
  validate(opts);

  if (opts.id) {
    resolve(opts.id);
  } else if (opts.appId) {
    resolve(app(opts).then(app => app.id));
  }
})
  .then((id) => {
    opts = opts || {};
    opts.sort = opts.sort || c.sort.RECENT;
    opts.page = opts.page || 1;
    opts.country = opts.country || 'us';

    const url = `https://itunes.apple.com/${opts.country}/rss/customerreviews/page=${opts.page}/id=${id}/sortby=${opts.sort}/json`;
    return common.request(url, {}, opts.requestOptions);
  })
  .then((response) => typeof response === 'string' ? JSON.parse(response) : response)
  .then(cleanList);

function validate (opts) {
  const { ValidationError, ErrorHelpers } = require('./errors');
  
  if (!opts || typeof opts !== 'object') {
    throw new ValidationError('Options object is required');
  }
  
  if (!opts.id && !opts.appId) {
    throw ErrorHelpers.missingParameter('id or appId', 'Provide either "id" (numeric App Store ID) or "appId" (bundle identifier)');
  }

  if (opts.sort && !R.includes(opts.sort, R.values(c.sort))) {
    const validSorts = R.values(c.sort);
    throw ErrorHelpers.invalidParameter('sort', opts.sort, `Valid options are: ${validSorts.join(', ')}`);
  }

  if (opts.page && (typeof opts.page !== 'number' || opts.page < 1)) {
    throw ErrorHelpers.invalidParameter('page', opts.page, 'Must be a number starting from 1');
  }

  if (opts.page && opts.page > 10) {
    throw ErrorHelpers.invalidParameter('page', opts.page, 'Cannot be greater than 10 (Apple Store limitation)');
  }
  
  if (opts.country && (typeof opts.country !== 'string' || opts.country.length !== 2)) {
    throw ErrorHelpers.invalidParameter('country', opts.country, 'Must be a 2-letter country code (e.g., "us", "gb", "fr")');
  }
}

module.exports = reviews;
