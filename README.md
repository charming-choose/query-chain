# query-chain

## Introduction

- The QueryChain class is a utility tool that enables you to define a chain of query operations with customizable plugin hooks for preprocessing, error handling, and postprocessing.

## Installation

- To utilize the QueryChain class, include the source code in your project and import as needed.

```shell
npm install @charming-choose/query-chain
```

## Usage

### Initialization

- Create an instance of QueryChain by passing a fetch function in the constructor.

```js
import QueryChain from '@charming-choose/query-chain'

const queryChain = new QueryChain(fetch)

queryChain.query(params).then(response => response)
```

### Plugin Usage

- QueryChain natively supports three plugins: concurrency control for parallel queries, caching and merging of duplicate queries, and automatic query error retries.

```js
import { concurrency, duplicate, errorRetry } from '@charming-choose/query-chain/plugins'
const queryChain = new QueryChain(fetch).use(concurrency).use(duplicate).use(errorRetry)

queryChain.query(params, {
  concurrent:{},
  cache:{},
  errorRetry:{},
}).then(response => response)
```

#### Concurrency Control (`concurrency`)

- Limits the maximum number of concurrent queries for the same key. Queries exceeding this limit enter a pending state until preceding queries conclude.

```js
const query = params => queryChain.query(params, {
  concurrent: {
    key: 'concurrentKey', // Only queries with the same key are subject to concurrency control
    count: 3, // Maximum concurrent queries
  },
})

query({data:1})
query({data:2})
query({data:3})
query({data:4}) // Waits until data:1's query ends

// Equivalent to:
Promise.all([query({data:1}), query({data:2}), query({data:3})]).finally(() => query({data:4}))
```

- Setting count to 1 ensures queries execute in the order they were called.

```js
const query = params => queryChain.query(params, {
  concurrent: {
    key: 'concurrentKey',
    count: 1,
  },
})

query({data:1})
query({data:2}) // Waits until data:1 completes
// Sequential execution equivalent:
query({data:1})
.then(() => query({data:2}))
```

#### Caching & Merging (`cache`)

- Caches query results and merges identical queries within a given timeframe.

##### `staleTime`: Freshness Period

```js
let num = 1
const fetch = () => new Promise(resolve => setTimeout(() => resolve(num++), 5*1000))

const queryChain = new QueryChain(fetch)

const query = () => queryChain.query({}, {
  cache: {
    cacheKey: 'duplicateKey', // Cache key; only queries with the same key trigger caching
    staleTime: 10 * 1000, // Freshness duration in milliseconds
  },
})

query().then(res => console.log(res)) // Logs: 1
setTimeout(() => query().then(res => console.log(res)), 5*1000) // Pending, then logs: 1
setTimeout(() => query().then(res => console.log(res)), 10*1000) // Logs: 2
```

##### `cacheTime`: Cache Duration

```js
let num = 1
const fetch = () => new Promise(resolve => setTimeout(() => resolve(num++), 6*1000))

const queryChain = new QueryChain(fetch)

const query = () => queryChain.query({}, {
  cache: {
    cacheKey: 'duplicateKey',
    cacheTime: 15 * 60 * 1000, // Cache duration in milliseconds
    staleTime: 10 * 1000,
  },
})

query().then(res => console.log(res)) // Logs: 1
setTimeout(() => query().then(res => console.log(res)), 10*1000) // Logs: 1 (from cache)
setTimeout(() => query().then(res => console.log(res)), 15*60*1000) // Logs: 2 (cache expired)
```

#### Error Retry (`errorRetry`)

- Automatically retries queries upon encountering errors during the process or in the result.

```js
let num = 1
const fetch = () => new Promise(resolve => setTimeout(() => {
  console.log('fetch:', num)
  resolve(num++)
}, 5*1000))

const queryChain = new QueryChain(fetch)

const query = () => queryChain.query({}, {
  errorRetry: {
    count: 3, // Retry attempts
    interval: 300, // Interval between retries in milliseconds
    checkError: d => d < 3, // Error check function
  },
})

query().then(res => console.log('Result:', res))

// Output:
// fetch: 1
// fetch: 2
// fetch: 3
// Result: 3
```

### Registering Plugins

- Extend the functionality of the query chain by registering custom plugins using the `use` method.

```js
queryChain.use({
  onQueryBefore: async (params, options) => {
    // Actions before querying
  },
  onQueryed: async (params, options) => {
    // Actions after querying
  },
  onError: async (params, options) => {
    // Error handling
  }
})
```

### Executing Queries

- Initiate the execution of the query chain with specified parameters via the `query` method.

```js
queryChain.query(params, pluginParams)
  .then(response => {
    // Handle the final response
  })
  .catch(error => {
    // Handle any errors
  })
```

### Plugin Hooks

- `onQueryBefore`: Executes before the query, allows modifying parameters.
- `onQueryed`: Executes after the query, with access to response data.
- `onError`: Handles errors during the query process.

### Error Handling

- Any errors occurring at any stage in the query chain are propagated and can be caught using standard Promise error handling.

### TypeScript Support

- QueryChain includes TypeScript support with typed parameters and plugin options.

### Note

- Ensure the fetch function provided to the QueryChain instance returns a Promise to effectively manage asynchronous operations.