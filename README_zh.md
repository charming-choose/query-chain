# query-chain

## 简介
- QueryChain 类是一个实用工具，允许您定义一个查询操作链，可以自定义插件钩子用于预处理、错误处理和后处理。

## 安装
- 要使用 QueryChain 类，请将源代码包含在您的项目中，并根据需要进行导入。
```shell
npm install @charming-choose/query-chain
```

## 用法

### 初始化
- 通过在构造函数中传递一个 fetch 函数来创建 QueryChain 的实例。
```js

import QueryChain from '@charming-choose/query-chain'

const queryChain = new QueryChain(fetch)

queryChain.query(params).then(response => response)
```

### 插件使用
- queryChain 内置了三个插件，分别为：并发查询控制 ``` concurrency ```, 查询缓存与合并``` duplicate ```, and 查询错误重试``` errorRetry ```。
```js
import { concurrency, duplicate, errorRetry } from '@charming-choose/query-chain/plugins'
const queryChain = new QueryChain(fetch).use(concurrency).use(duplicate).use(errorRetry)

queryChain.query(params, {
  concurrent:{},
  cache:{},
  errorRetry:{},
}).then(response => response)

```

#### 并发查询控制 concurrency
- 并发查询控制：当前相同key的查询，最大并发数量，如果超出最大并发数，超出的查询将会进入等待状态，直到前面的查询结果变化为查询结束。
```js
const query = params => queryChain.query(params, {
  concurrent: {
    key: 'concurrentKey', // 只有key相同的查询，才会并发控制
    count: 3, // 最大并发查询数
  },
})

query({data:1})
query({data:2})
query({data:3})
query({data:4}) // pedding状态，直到data:1的查询结束

// 上述代码等同于
Promise.all([query({data:1}), query({data:2}), query({data:3})]).finally(() => query({data:4}))
```
- 如果将count设置为1，将会按照执行query的顺序执行查询。
```js
const query = params => queryChain.query(params, {
  concurrent: {
    key: 'concurrentKey', // 只有key相同的查询，才会并发控制
    count: 1, // 最大并发查询数
  },
})

query({data:1})
query({data:2})
query({data:3})
query({data:4}) // pedding状态，直到data:1的查询结束

// 上述代码等同于
query({data:1})
.then(() => query({data:2}))
.then(() => query({data:3}))
.then(() => query({data:4}))
```

#### 查询缓存与合并 cache
- 查询缓存与合并：缓存查询的结果，并合并单位时间内的相同key的查询。

##### staleTime 保鲜时间
```js
let num = 1
function fetch() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(num++)
    }, 5*1000)
  })
}

const queryChain = new QueryChain(fetch)

const query = () => queryChain.query({}, {
  cache: {
    cacheKey: 'duplicateKey', // 缓存的key，只有key相同的查询，才会触发cache
    staleTime: 10 * 1000, // 保鲜的时间（ms）
  }
})

query().then(res => {
  console.log(res) // 查询的结果： 1
})
setTimeout(() => {
  query().then(res => { // 不会发出实际查询，未出了staleTime，将会进入pedding状态，直到第一次查询结束
    console.log(res) // 返回第一次查询的结果： 1
  })
}, 5*1000)

setTimeout(() => {
  query().then(res => { // 发出实际查询，此时距离第一次发出查询已经超出了10秒，超出了staleTime
  console.log(res) // 查询的结果： 2
})
}, 10*1000)

setTimeout(() => {
  query().then(res => { // 不会发出实际查询，距离第三次的查询，不超出保活时间
  console.log(res) // 查询的结果： 2
})
}, 10*1000)

```

##### cacheTime 缓存时间
```js
let num = 1
function fetch() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(num++)
    }, 6*1000)
  })
}

const queryChain = new QueryChain(fetch)

const query = () => queryChain.query({}, {
  cache: {
    cacheKey: 'duplicateKey', // 缓存的key，只有key相同的查询，才会触发cache
    cacheTime: 15 * 60 * 1000, // 缓存的时间（ms）
    staleTime: 10 * 1000, // 保鲜的时间（ms）
  }
})

query().then(res => {
  console.log(res) // 查询的结果： 1
})

query().then(res => { // 不会发出实际查询，未出了staleTime，将会进入pedding状态，直到第一次查询结束
  console.log(res) // 返回第一次查询的结果： 1
})

setTimeout(() => {
  query().then(res => { // 不会发出实际查询，虽然超出了staleTime，但是未超出cacheTime，将会直接从缓存中返回数据
  console.log(res) // 返回第一次查询的结果： 1
})
}, 10*1000)

setTimeout(() => {
  query().then(res => { // 发出实际查询，超出了staleTime和cacheTime
  console.log(res) // 查询的结果： 2
})
}, 15*60*1000)
```

#### 查询错误重试 errorRetry
- 当查询过程或者结果发送错误的时候，自动重试。
```js
let num = 1
function fetch() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('fetch: ', num)
      resolve(num++)
    }, 5*1000)
  })
}

const queryChain = new QueryChain(fetch)

const query = () => queryChain.query({}, {
  errorRetry: {
    count: 3, // 重试次数
    interval: 300, // 重试间隔时间（ms）
    checkError: (d) => d < 3 // 判断是否错误
  }
})

query().then(res => {
  console.log('查询的结果：', res)
})

// log输出
// fetch: 1 // 第一次查询，返回1
// fetch: 2 // 自动发起第二次查询，返回2
// fetch: 3 // 自动发起第三次查询，返回3， 虽然当前重试次数小于配置的3次，但因为返回结果正确，不再重新发起查询
// 查询的结果： 3

```


### 注册插件
- 您可以使用 use 方法注册自定义插件，以扩展查询链的功能。.
- 向QueryChain控件实例添加插件。插件是一个可以有三种方法的对象，即“onQueryBefore”、“onQueryed”和“onError”。
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

### 执行查询
- 调用 query 方法以使用指定的参数开始查询链的执行。
```js
queryChain.query(params, pluginParams)
  .then(response => {
    // Handle the final response
  })
  .catch(error => {
    // Handle any errors
  })
```

### 插件钩子
- onQueryBefore: 在查询之前执行，可以修改参数。
- onQueryed: 在查询之后执行，可以访问响应数据。
- onError: 在查询期间发生错误时执行。

### 错误处理
- 如果在查询链的任何阶段发生错误，它将被传播并可以使用标准的 Promise 错误处理方法捕获。

### TypeScript 支持
- QueryChain 类包括对 TypeScript 的支持，为参数和插件选项定义了类型

### 注意
- 请确保提供给 QueryChain 实例的 fetch 函数返回一个 Promise，以有效处理异步操作。


