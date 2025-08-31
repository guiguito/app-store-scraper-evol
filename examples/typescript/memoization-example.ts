// Advanced TypeScript example showing memoization and error handling

import * as appStore from 'app-store-scraper';
import { 
  AppOptions,
  AppResult, 
  MemoizeOptions,
  MemoizedMethods,
  AppStoreScraperError,
  ValidationError,
  RateLimitError
} from 'app-store-scraper';

// Create memoized instance with custom options
function createMemoizedInstance(): MemoizedMethods {
  const memoOptions: MemoizeOptions = {
    maxAge: 10 * 60 * 1000, // 10 minutes
    max: 500, // Store up to 500 results
    primitive: true,
    normalizer: (args: any[]) => JSON.stringify(args)
  };

  return appStore.memoized(memoOptions);
}

async function demonstrateMemoization(): Promise<void> {
  const memoizedStore = createMemoizedInstance();

  console.log('🔄 Testing memoization...');
  
  const appId = '6448311069'; // ChatGPT
  const options: AppOptions = { id: appId, country: 'us', ratings: true };

  // First call - will hit the API
  console.time('First call (API)');
  const app1: AppResult = await memoizedStore.app(options);
  console.timeEnd('First call (API)');
  console.log(`Fetched: ${app1.title}`);

  // Second call - will use cache
  console.time('Second call (cached)');
  const app2: AppResult = await memoizedStore.app(options);
  console.timeEnd('Second call (cached)');
  console.log(`From cache: ${app2.title}`);
  
  // Verify they're the same
  console.log(`Same data: ${app1.id === app2.id ? '✅' : '❌'}`);
}

async function comprehensiveErrorHandling(): Promise<void> {
  console.log('🚨 Testing comprehensive error handling...');

  const testCases = [
    {
      name: 'Missing parameter',
      options: {} as AppOptions, // Intentionally invalid
    },
    {
      name: 'Invalid app ID',
      options: { id: 'clearly-not-a-number' } as AppOptions,
    },
    {
      name: 'Invalid country code', 
      options: { id: '123456789', country: 'invalid' as any },
    },
    {
      name: 'App not found',
      options: { id: '999999999999' } as AppOptions,
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Testing: ${testCase.name}`);
      await appStore.app(testCase.options);
      console.log('❌ Should have thrown an error');
    } catch (error) {
      // Type-safe error handling
      if (error instanceof ValidationError) {
        console.log(`✅ ValidationError: ${error.message}`);
        console.log(`   Field: ${error.field || 'unknown'}`);
        console.log(`   Code: ${error.code}`);
      } else if (error instanceof RateLimitError) {
        console.log(`✅ RateLimitError: ${error.message}`);
        console.log(`   Retry after: ${error.retryAfter || 'unknown'} seconds`);
      } else if ((error as AppStoreScraperError).code) {
        const appError = error as AppStoreScraperError;
        console.log(`✅ ${appError.constructor.name}: ${appError.message}`);
        console.log(`   Code: ${appError.code}`);
        if ('details' in appError && appError.details) {
          console.log(`   Details:`, Object.keys(appError.details));
        }
      } else {
        console.log(`❓ Unexpected error: ${error}`);
      }
    }
  }
}

// Type-safe generic function for batch operations
async function batchAppFetch<T extends string | number>(
  appIds: T[],
  options: Omit<AppOptions, 'id'>
): Promise<(AppResult | null)[]> {
  const results: (AppResult | null)[] = [];
  
  for (const id of appIds) {
    try {
      const app = await appStore.app({ ...options, id });
      results.push(app);
    } catch (error) {
      console.error(`Failed to fetch app ${id}:`, error instanceof Error ? error.message : error);
      results.push(null);
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function demonstrateBatchFetching(): Promise<void> {
  console.log('📦 Testing batch fetching with error resilience...');
  
  const appIds = [
    '6448311069', // ChatGPT - valid
    '6446901002', // Threads - valid  
    '999999999',  // Invalid ID
    '553834731'   // Candy Crush - valid
  ];
  
  const options: Omit<AppOptions, 'id'> = {
    country: 'us',
    ratings: false
  };
  
  const results = await batchAppFetch(appIds, options);
  
  console.log('\n📊 Batch results:');
  results.forEach((app, index) => {
    if (app) {
      console.log(`✅ ${appIds[index]}: ${app.title} by ${app.developer}`);
    } else {
      console.log(`❌ ${appIds[index]}: Failed to fetch`);
    }
  });
  
  const successfulFetches = results.filter(app => app !== null).length;
  console.log(`\n📈 Success rate: ${successfulFetches}/${results.length} (${Math.round(successfulFetches / results.length * 100)}%)`);
}

// Main function demonstrating advanced usage
async function main(): Promise<void> {
  console.log('⚡ Advanced TypeScript Examples\n');
  
  try {
    await demonstrateMemoization();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await comprehensiveErrorHandling();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await demonstrateBatchFetching();
    
  } catch (error) {
    console.error('💥 Unexpected error in main:', error);
  }
}

// Export for use in other modules
export {
  createMemoizedInstance,
  comprehensiveErrorHandling,
  batchAppFetch
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}