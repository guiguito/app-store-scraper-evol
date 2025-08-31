// Constants and enums for app-store-scraper

/**
 * App Store collections for different platforms and types
 */
export interface Collection {
  readonly TOP_MAC: 'topmacapps';
  readonly TOP_FREE_MAC: 'topfreemacapps';
  readonly TOP_GROSSING_MAC: 'topgrossingmacapps';
  readonly TOP_PAID_MAC: 'toppaidmacapps';
  readonly NEW_IOS: 'newapplications';
  readonly NEW_FREE_IOS: 'newfreeapplications';
  readonly NEW_PAID_IOS: 'newpaidapplications';
  readonly TOP_FREE_IOS: 'topfreeapplications';
  readonly TOP_FREE_IPAD: 'topfreeipadapplications';
  readonly TOP_GROSSING_IOS: 'topgrossingapplications';
  readonly TOP_GROSSING_IPAD: 'topgrossingipadapplications';
  readonly TOP_PAID_IOS: 'toppaidapplications';
  readonly TOP_PAID_IPAD: 'toppaidipadapplications';
}

/**
 * Collection values type
 */
export type CollectionValue = Collection[keyof Collection];

/**
 * App Store categories with their numeric IDs
 */
export interface Category {
  readonly BOOKS: 6018;
  readonly BUSINESS: 6000;
  readonly CATALOGS: 6022;
  readonly EDUCATION: 6017;
  readonly ENTERTAINMENT: 6016;
  readonly FINANCE: 6015;
  readonly FOOD_AND_DRINK: 6023;
  readonly GAMES: 6014;
  readonly GAMES_ACTION: 7001;
  readonly GAMES_ADVENTURE: 7002;
  readonly GAMES_ARCADE: 7003;
  readonly GAMES_BOARD: 7004;
  readonly GAMES_CARD: 7005;
  readonly GAMES_CASINO: 7006;
  readonly GAMES_DICE: 7007;
  readonly GAMES_EDUCATIONAL: 7008;
  readonly GAMES_FAMILY: 7009;
  readonly GAMES_MUSIC: 7011;
  readonly GAMES_PUZZLE: 7012;
  readonly GAMES_RACING: 7013;
  readonly GAMES_ROLE_PLAYING: 7014;
  readonly GAMES_SIMULATION: 7015;
  readonly GAMES_SPORTS: 7016;
  readonly GAMES_STRATEGY: 7017;
  readonly GAMES_TRIVIA: 7018;
  readonly GAMES_WORD: 7019;
  readonly HEALTH_AND_FITNESS: 6013;
  readonly LIFESTYLE: 6012;
  readonly MAGAZINES_AND_NEWSPAPERS: 6021;
  readonly MEDICAL: 6020;
  readonly MUSIC: 6011;
  readonly NAVIGATION: 6010;
  readonly NEWS: 6009;
  readonly PHOTO_AND_VIDEO: 6008;
  readonly PRODUCTIVITY: 6007;
  readonly REFERENCE: 6006;
  readonly SHOPPING: 6024;
  readonly SOCIAL_NETWORKING: 6005;
  readonly SPORTS: 6004;
  readonly STICKERS: 6025;
  readonly TRAVEL: 6003;
  readonly UTILITIES: 6002;
  readonly WEATHER: 6001;
}

/**
 * Category values type (numeric IDs)
 */
export type CategoryValue = Category[keyof Category];

/**
 * Sorting options for reviews and lists
 */
export interface Sort {
  readonly RECENT: 'mostRecent';
  readonly HELPFUL: 'mostHelpful';
}

/**
 * Sort values type
 */
export type SortValue = Sort[keyof Sort];

/**
 * Device types for App Store lookups
 */
export interface Device {
  readonly IPAD: 'iPadSoftware';
  readonly MAC: 'macSoftware';
  readonly ALL: 'software';
}

/**
 * Device values type
 */
export type DeviceValue = Device[keyof Device];

/**
 * Country codes and their corresponding iTunes store IDs
 */
export interface Country {
  readonly AE: 'ae';
  readonly AG: 'ag';
  readonly AI: 'ai';
  readonly AL: 'al';
  readonly AM: 'am';
  readonly AO: 'ao';
  readonly AR: 'ar';
  readonly AT: 'at';
  readonly AU: 'au';
  readonly AZ: 'az';
  readonly BB: 'bb';
  readonly BE: 'be';
  readonly BF: 'bf';
  readonly BG: 'bg';
  readonly BH: 'bh';
  readonly BJ: 'bj';
  readonly BM: 'bm';
  readonly BN: 'bn';
  readonly BO: 'bo';
  readonly BR: 'br';
  readonly BS: 'bs';
  readonly BT: 'bt';
  readonly BW: 'bw';
  readonly BY: 'by';
  readonly BZ: 'bz';
  readonly CA: 'ca';
  readonly CG: 'cg';
  readonly CH: 'ch';
  readonly CL: 'cl';
  readonly CN: 'cn';
  readonly CO: 'co';
  readonly CR: 'cr';
  readonly CV: 'cv';
  readonly CY: 'cy';
  readonly CZ: 'cz';
  readonly DE: 'de';
  readonly DK: 'dk';
  readonly DM: 'dm';
  readonly DO: 'do';
  readonly DZ: 'dz';
  readonly EC: 'ec';
  readonly EE: 'ee';
  readonly EG: 'eg';
  readonly ES: 'es';
  readonly FI: 'fi';
  readonly FJ: 'fj';
  readonly FM: 'fm';
  readonly FR: 'fr';
  readonly GB: 'gb';
  readonly GD: 'gd';
  readonly GH: 'gh';
  readonly GM: 'gm';
  readonly GR: 'gr';
  readonly GT: 'gt';
  readonly GW: 'gw';
  readonly GY: 'gy';
  readonly HK: 'hk';
  readonly HN: 'hn';
  readonly HR: 'hr';
  readonly HU: 'hu';
  readonly ID: 'id';
  readonly IE: 'ie';
  readonly IL: 'il';
  readonly IN: 'in';
  readonly IS: 'is';
  readonly IT: 'it';
  readonly JM: 'jm';
  readonly JO: 'jo';
  readonly JP: 'jp';
  readonly KE: 'ke';
  readonly KG: 'kg';
  readonly KH: 'kh';
  readonly KN: 'kn';
  readonly KR: 'kr';
  readonly KW: 'kw';
  readonly KY: 'ky';
  readonly KZ: 'kz';
  readonly LA: 'la';
  readonly LB: 'lb';
  readonly LC: 'lc';
  readonly LK: 'lk';
  readonly LR: 'lr';
  readonly LT: 'lt';
  readonly LU: 'lu';
  readonly LV: 'lv';
  readonly MD: 'md';
  readonly MG: 'mg';
  readonly MK: 'mk';
  readonly ML: 'ml';
  readonly MM: 'mm';
  readonly MN: 'mn';
  readonly MO: 'mo';
  readonly MR: 'mr';
  readonly MS: 'ms';
  readonly MT: 'mt';
  readonly MU: 'mu';
  readonly MW: 'mw';
  readonly MX: 'mx';
  readonly MY: 'my';
  readonly MZ: 'mz';
  readonly NA: 'na';
  readonly NE: 'ne';
  readonly NG: 'ng';
  readonly NI: 'ni';
  readonly NL: 'nl';
  readonly NO: 'no';
  readonly NP: 'np';
  readonly NR: 'nr';
  readonly NZ: 'nz';
  readonly OM: 'om';
  readonly PA: 'pa';
  readonly PE: 'pe';
  readonly PG: 'pg';
  readonly PH: 'ph';
  readonly PK: 'pk';
  readonly PL: 'pl';
  readonly PT: 'pt';
  readonly PW: 'pw';
  readonly PY: 'py';
  readonly QA: 'qa';
  readonly RO: 'ro';
  readonly RU: 'ru';
  readonly SA: 'sa';
  readonly SB: 'sb';
  readonly SC: 'sc';
  readonly SE: 'se';
  readonly SG: 'sg';
  readonly SI: 'si';
  readonly SK: 'sk';
  readonly SL: 'sl';
  readonly SN: 'sn';
  readonly SR: 'sr';
  readonly ST: 'st';
  readonly SV: 'sv';
  readonly SZ: 'sz';
  readonly TC: 'tc';
  readonly TD: 'td';
  readonly TH: 'th';
  readonly TJ: 'tj';
  readonly TM: 'tm';
  readonly TN: 'tn';
  readonly TO: 'to';
  readonly TR: 'tr';
  readonly TT: 'tt';
  readonly TW: 'tw';
  readonly TZ: 'tz';
  readonly UA: 'ua';
  readonly UG: 'ug';
  readonly US: 'us';
  readonly UY: 'uy';
  readonly UZ: 'uz';
  readonly VC: 'vc';
  readonly VE: 've';
  readonly VG: 'vg';
  readonly VN: 'vn';
  readonly VU: 'vu';
  readonly WS: 'ws';
  readonly YE: 'ye';
  readonly ZA: 'za';
  readonly ZW: 'zw';
}

/**
 * Country values type
 */
export type CountryValue = Country[keyof Country];

/**
 * Store ID mappings for different countries
 */
export interface Markets {
  [countryCode: string]: string;
}

/**
 * Combined constants interface
 */
export interface Constants {
  collection: Collection;
  category: Category;
  device: Device;
  sort: Sort;
  country: Country;
  markets: Markets;
}