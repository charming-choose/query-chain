# query-chain

## Introduction
- The QueryChain class is a utility that allows you to define a chain of query operations with customizable plugin hooks for preprocessing, error handling, and post-processing.

## Installation
- To use the QueryChain class, include the source code in your project and import it as needed.
```shell
npm install @charming-choose/query-chain
```

## Usage

### Initialization
- Create an instance of QueryChain by passing a fetch function to the constructor.
```js
import axios from 'axios'
import QueryChain from '@charming-choose/query-chain'

const queryChain = new QueryChain(axios)

queryChain.query(params).then(response => response)
```

### Plugin Usage
```js
import { concurrency, duplicate, errorRetry } from '@charming-choose/query-chain/plugins'
const queryChain = new QueryChain(axios).use(concurrency).use(duplicate).use(errorRetry)

queryChain.query(params, {
  concurrent:{},
  cache:{},
  errorRetry:{},
}).then(response => response)

```

### Registering Plugins
- You can register custom plugins with the use method to extend the functionality of the query chain.
- Adds a plugin to the QueryChain control instance. A plugin is an object that can have three methods, ``` onQueryBefore ```, ``` onQueryed ```, and ``` onError ```.
```js
queryChain.use({
  onQueryBefore: async (params, options) => {
    // Perform actions before querying
  },
  onQueryed: async (params, options) => {
    // Perform actions after querying
  },
  onError: async (params, options) => {
    // Handle errors during querying
  }
})
```

### Executing Queries
- Invoke the query method to start the query chain execution with the specified parameters.
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
- onQueryBefore: Executed before querying with the ability to modify parameters.
- onQueryed: Executed after querying with access to the response data.
- onError: Executed when an error occurs during querying.

### Error Handling
- If an error occurs at any stage of the query chain, it will be propagated up and can be caught using standard Promise error handling.

### TypeScript Support
- The QueryChain class includes TypeScript support with defined types for parameters and plugin options.

### Note
- Please ensure that the fetch function provided to the QueryChain instance returns a Promise to handle asynchronous operations effectively.

