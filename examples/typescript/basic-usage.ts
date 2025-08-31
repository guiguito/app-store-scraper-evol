// TypeScript usage examples for app-store-scraper

import * as appStore from 'app-store-scraper';
import { 
  AppOptions, 
  AppResult, 
  SearchOptions, 
  SearchResult,
  ListOptions,
  ReviewsOptions,
  ReviewResult,
  RatingsOptions,
  RatingsResult,
  ValidationError,
  NotFoundError,
  NetworkError
} from 'app-store-scraper';

async function basicAppExample(): Promise<void> {
  try {
    // Basic app lookup with type safety
    const appOptions: AppOptions = {
      id: '6446901002', // Threads app
      country: 'us',
      ratings: true
    };

    const app: AppResult = await appStore.app(appOptions);
    
    // TypeScript provides full intellisense here
    console.log(`App: ${app.title} by ${app.developer}`);
    console.log(`Rating: ${app.score}/5 (${app.reviews} reviews)`);
    console.log(`Screenshots: ${app.screenshots.length} iPhone, ${app.ipadScreenshots.length} iPad`);
    
    // Optional properties are properly typed
    if (app.histogram) {
      console.log(`5-star ratings: ${app.histogram[5]}`);
    }

  } catch (error) {
    // Error handling with proper types
    if (error instanceof ValidationError) {
      console.error(`Validation error: ${error.message}`);
      console.error(`Field: ${error.field}`);
    } else if (error instanceof NotFoundError) {
      console.error(`App not found: ${error.resourceId}`);
    } else if (error instanceof NetworkError) {
      console.error(`Network error: ${error.message} (${error.statusCode})`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

async function searchExample(): Promise<void> {
  try {
    const searchOptions: SearchOptions = {
      term: 'messaging',
      num: 10,
      page: 1,
      country: 'us'
    };

    const results: SearchResult[] = await appStore.search(searchOptions);
    
    // Type-safe iteration
    results.forEach((app: AppResult, index: number) => {
      console.log(`${index + 1}. ${app.title} (${app.price === 0 ? 'Free' : `$${app.price}`})`);
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`Search validation error: ${error.message}`);
    }
  }
}

async function reviewsExample(): Promise<void> {
  try {
    const reviewsOptions: ReviewsOptions = {
      id: '6448311069', // ChatGPT
      sort: 'mostRecent',
      page: 1,
      country: 'us'
    };

    const reviews: ReviewResult[] = await appStore.reviews(reviewsOptions);
    
    reviews.forEach((review: ReviewResult) => {
      console.log(`${review.title} - ${review.rating}/5`);
      console.log(`By ${review.userName} on ${review.date}`);
      console.log(`Review: ${review.text.substring(0, 100)}...`);
      console.log('---');
    });

  } catch (error) {
    console.error('Reviews error:', error);
  }
}

async function ratingsExample(): Promise<void> {
  try {
    const ratingsOptions: RatingsOptions = {
      id: '6448311069' // ChatGPT
    };

    const ratings: RatingsResult = await appStore.ratings(ratingsOptions);
    
    console.log(`Overall rating: ${ratings.score}/5`);
    console.log(`Total reviews: ${ratings.reviews}`);
    console.log('Rating distribution:');
    
    // Type-safe histogram access
    for (let star = 5; star >= 1; star--) {
      const count = ratings.histogram[star as keyof typeof ratings.histogram];
      console.log(`${star} stars: ${count} reviews`);
    }

  } catch (error) {
    console.error('Ratings error:', error);
  }
}

async function listExample(): Promise<void> {
  try {
    const listOptions: ListOptions = {
      collection: 'topfreeapplications',
      category: 6005, // Social Networking
      num: 25,
      country: 'us'
    };

    const apps: AppResult[] = await appStore.list(listOptions);
    
    console.log(`Top ${apps.length} free social networking apps:`);
    apps.forEach((app: AppResult, index: number) => {
      console.log(`${index + 1}. ${app.title} - ${app.score}/5`);
    });

  } catch (error) {
    console.error('List error:', error);
  }
}

// Demonstrate constant usage with types
function constantsExample(): void {
  // TypeScript knows these are the correct constant values
  const topFreeCollection = appStore.collection.TOP_FREE_IOS;
  const gamesCategory = appStore.category.GAMES;
  const mostRecent = appStore.sort.RECENT;
  
  console.log(`Using collection: ${topFreeCollection}`);
  console.log(`Games category ID: ${gamesCategory}`);
  console.log(`Sort by: ${mostRecent}`);
}

// Main execution
async function main(): Promise<void> {
  console.log('🎯 TypeScript App Store Scraper Examples\n');
  
  await basicAppExample();
  console.log('\n---\n');
  
  await searchExample();
  console.log('\n---\n');
  
  await reviewsExample();
  console.log('\n---\n');
  
  await ratingsExample();
  console.log('\n---\n');
  
  await listExample();
  console.log('\n---\n');
  
  constantsExample();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}