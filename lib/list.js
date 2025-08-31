'use strict';

const R = require('ramda');
const common = require('./common');
const c = require('./constants');

function parseLink (app) {
  if (app.link) {
    const linkArray = Array.isArray(app.link) ? app.link : [app.link];
    const link = linkArray.find(link => link.attributes.rel === 'alternate');
    return link && link.attributes.href;
  }
  return undefined;
}

function cleanApp (app) {
  let developerUrl, developerId;
  if (app['im:artist'].attributes) {
    developerUrl = app['im:artist'].attributes.href;

    if (app['im:artist'].attributes.href.includes('/id')) {
      // some non developer urls can sneak in here
      // e.g. href: 'https://itunes.apple.com/us/artist/sling-tv-llc/959665097?mt=8&uo=2'
      developerId = app['im:artist'].attributes.href.split('/id')[1].split('?mt')[0];
    }
  }

  const price = parseFloat(app['im:price'].attributes.amount);
  return {
    id: app.id.attributes['im:id'],
    appId: app.id.attributes['im:bundleId'],
    title: app['im:name'].label,
    icon: app['im:image'][app['im:image'].length - 1].label,
    url: parseLink(app),
    price,
    currency: app['im:price'].attributes.currency,
    free: price === 0,
    description: app.summary ? app.summary.label : undefined,
    developer: app['im:artist'].label,
    developerUrl,
    developerId,
    genre: app.category.attributes.label,
    genreId: app.category.attributes['im:id'],
    released: app['im:releaseDate'].label
  };
}

function processResults (opts) {
  return function (results) {
    const apps = results.feed.entry;

    if (opts.fullDetail) {
      const ids = apps.map((app) => app.id.attributes['im:id']);
      return common.lookup(ids, 'id', opts.country, opts.lang, opts.requestOptions, opts.throttle);
    }

    return apps.map(cleanApp);
  };
}

function validate (opts) {
  const { ValidationError, ErrorHelpers } = require('./errors');
  
  if (!opts || typeof opts !== 'object') {
    throw new ValidationError('Options object is required');
  }

  if (opts.category && !R.includes(opts.category, R.values(c.category))) {
    const validCategories = R.values(c.category);
    throw ErrorHelpers.invalidParameter('category', opts.category, `Valid categories: ${validCategories.slice(0, 5).join(', ')}... (${validCategories.length} total)`);
  }

  opts.collection = opts.collection || c.collection.TOP_FREE_IOS;
  if (!R.includes(opts.collection, R.values(c.collection))) {
    const validCollections = R.values(c.collection);
    throw ErrorHelpers.invalidParameter('collection', opts.collection, `Valid collections: ${validCollections.slice(0, 3).join(', ')}... (${validCollections.length} total)`);
  }

  opts.num = opts.num || 50;
  if (typeof opts.num !== 'number' || opts.num < 1) {
    throw ErrorHelpers.invalidParameter('num', opts.num, 'Must be a positive number');
  }
  
  if (opts.num > 200) {
    throw ErrorHelpers.invalidParameter('num', opts.num, 'Cannot retrieve more than 200 apps (Apple Store limitation)');
  }

  opts.country = opts.country || 'us';
  if (typeof opts.country !== 'string' || opts.country.length !== 2) {
    throw ErrorHelpers.invalidParameter('country', opts.country, 'Must be a 2-letter country code (e.g., "us", "gb", "fr")');
  }
}

function list (opts) {
  return new Promise(function (resolve, reject) {
    opts = R.clone(opts || {});
    validate(opts);

    const category = opts.category ? `/genre=${opts.category}` : '';
    const storeId = common.storeId(opts.country);
    const url = `http://ax.itunes.apple.com/WebObjects/MZStoreServices.woa/ws/RSS/${opts.collection}/${category}/limit=${opts.num}/json?s=${storeId}`;
    common.request(url, {}, opts.requestOptions)
      .then((response) => typeof response === 'string' ? JSON.parse(response) : response)
      .then(processResults(opts))
      .then(resolve)
      .catch(reject);
  });
}

module.exports = list;
