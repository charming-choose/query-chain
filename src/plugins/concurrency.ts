import { getUnniKey } from '../utils/common'
import DeferredAsyncValue from '../utils/deferredAsyncValue'

const def_options = {
  key: '',
  count: 3, // 最大请求并发数
}


// 请求并发控制 Concurrent
export class Concurrency{
  currentQuerys = {} // 当前已经发送，但是未结束的请求
  waitingQuerys = new Map() // 当前未发送，pedding等待中的请求


  onQueryBefore(params: any, options: { concurrent: { count: any, key: string } }) {
    // 未开启请求并发控制，直接返回params
    if(!options?.concurrent) return params

    const { concurrent } = options
    const key = concurrent?.key || getUnniKey(params)
    
    options.concurrent = {
      ...def_options,
      ...concurrent,
      key
    }
    
    const currentQuerys = this.currentQuerys[key] || 0

    // 如果当前未结束的请求 小于 最大并发限制数
    if(currentQuerys < options.concurrent.count) {
      this.currentQuerys[key] = currentQuerys + 1
      return params
    }

    const waitingQuerys = this.waitingQuerys.get(key) || []
    const deferred = new DeferredAsyncValue(params)
    waitingQuerys.push(deferred)
    this.waitingQuerys.set(key, waitingQuerys)

    return deferred.result
    

  }

  onQueryed(result: any, options: { concurrent: { count: any } }) {
    if(!options?.concurrent) return result

    const key = options.concurrent.key
    const waitingQuerys = this.waitingQuerys.get(key) || []

    const deferred = waitingQuerys.shift()
    if(deferred) {
      this.waitingQuerys.set(key, waitingQuerys)
      deferred.success()
    }
    this.currentQuerys[key] = (this.currentQuerys[key] || 1) - 1

  }

  onError(error: any, options: { concurrent: { count: any } }) {
    if(!options?.concurrent) return Promise.reject(error)

    const key = options.concurrent.key
    const waitingQuerys = this.waitingQuerys.get(key) || []

    const deferred = waitingQuerys.shift()
    if(deferred) {
      this.waitingQuerys.set(key, waitingQuerys)
      deferred.success()
    }
    this.currentQuerys[key] = (this.currentQuerys[key] || 1) - 1
  }
}

export default new Concurrency()