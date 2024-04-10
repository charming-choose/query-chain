import axios from 'axios'
import QueryChain from '@charming-choose/query-chain'
import { concurrency, duplicate, errorRetry } from '@charming-choose/query-chain/plugins'

import errorMessage  from './errorMessage'
import processServerData  from './processServerData'

const queryChain = new QueryChain(axios)
.use(concurrency)
.use(duplicate)
.use(errorRetry)
.use(processServerData)
.use(errorMessage)


queryChain.query(params, {
  concurrent: {
    key: 'concurrentKey', // 只有key相同的查询，才会并发控制
    count: 3, // 最大并发查询数
  },
  cache: {
    cacheKey: 'duplicateKey', // 缓存的key，只有key相同的查询，才会触发cache
    cacheTime: 15 * 60 * 1000, // 缓存的时间（ms）
    staleTime: 10 * 1000, // 保鲜的时间（ms）
    setCache: (key, data) => window.localStorage.setItem(key, data), // 自定义缓存方法set
    getCache: (key) => window.localStorage.getItem(key) // 自定义缓存方法get
  },
  errorRetry: {
    count: 3, // 重试次数
    interval: 300, // 重试间隔时间（ms）
    checkError: (d: any) => d // 判断数据是否是error
  },
}).then(response => response)

