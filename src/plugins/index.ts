import concurrency from './concurrency' // 请求并发控制
import duplicate from './duplicate' // 重复请求合并 请求缓存
import errorRetry from './errorRetry' // 请求报错自动重试


export {
  concurrency,
  duplicate,
  errorRetry
}