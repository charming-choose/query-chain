import DeferredAsyncValue from '@charming-choose/deferred-async-value'
import { getUnniKey } from '../utils/common'

const def_options = {
  key: '',
  count: 3, // 默认值：最大请求并发数
}

type Key = string | number | symbol | Function

// 请求并发控制 Concurrent
export class Concurrency{
  currentQuerys: Record<string, number> = { key: 0 }// 当前已经发送，但是未结束的请求
  waitingQuerys = new Map() // 当前未发送，pedding等待中的请求

  onQueryBefore(params: any, options: { concurrent: { count: any, key: Key } }) {
    // 未开启请求并发控制，直接返回params
    if(!options?.concurrent) return params

    const { concurrent } = options
    let { key } = concurrent || {}

    if(typeof key === 'function') key = key(params)
      
    if(!key) key = getUnniKey(params)
    
    options.concurrent = {
      ...def_options,
      ...concurrent,
      key
    }

    const limit = options.concurrent.count || def_options.count

    return this.enqueue(key as string, limit, params)
    
  }

  onQueryed(result: any, options: { concurrent: { count: any, key: string } }) {
    if(!options?.concurrent) return Promise.reject(result)
      
    const key = options.concurrent?.key
    if(!key) return Promise.reject(result)

    this.release(key)
  
  }

  // 如果请求报错，放行一个等待中的请求
  onError(error: any, options: { concurrent: { count: any, key: string } }) {
    if(!options?.concurrent) return Promise.reject(error)
      
    const key = options.concurrent?.key
    if(!key) return Promise.reject(error)

    this.release(key)

  }
  private enqueue(key: string, limit: number, params: any) {
    const currentQuerys = this.currentQuerys[key] || 0

    // 如果当前未结束的请求 小于 最大并发限制数, 放行
    if(currentQuerys < limit) {
      this.currentQuerys[key] = currentQuerys + 1
      return params
    }

    // 当前请求需要等待 请求中的 请求结束，才会放行
    const waitingQuerys = this.waitingQuerys.get(key) || []

    // 创建异步数据
    const deferred = new DeferredAsyncValue(params)
    waitingQuerys.push(deferred)
    this.waitingQuerys.set(key, waitingQuerys)

    return deferred.result
  }
  private release(key: string) {
    const waitingQuerys = this.waitingQuerys.get(key) || []

    const deferred = waitingQuerys.shift()
    if(deferred) {
      this.waitingQuerys.set(key, waitingQuerys)
      deferred.success()
    }

    // 更新等待中的请求数
    this.currentQuerys[key] = (this.currentQuerys[key] || 1) - 1
  }
}

export default new Concurrency()