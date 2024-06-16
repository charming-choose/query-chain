import DeferredAsyncValue from '@charming-choose/deferred-async-value'
import { getUnniKey } from '../utils/common'
import storage from '../utils/storage'


const def_options = {
  key: 'duplicateKey', // 缓存的key
  cacheTime: 15 * 60 * 1000, // 缓存的时间（ms）
  staleTime: 10 * 1000, // 保鲜的时间（ms）：保鲜时间内
  setCache: storage.set.bind(storage),
  getCache: storage.get.bind(storage)
}

// 缓存请求的结果
export class Duplicate {
  responseMap = new Map() // 等待中的请求

  async onQueryBefore(params: any, options: { cache: any }) {
    // 未开启缓存，直接返回params
    if(!options?.cache) return params

    const { cache } = options
    let { key } = cache || {}

    if(typeof key === 'function') key = key(params)
      
    if(!key) key = getUnniKey(params)
    
    options.cache = {
      ...def_options,
      ...cache,
      key
    }

    // 缓存中存在key对应的数据，直接rejected数据，并通过isDuplicateStatus标记 由onError返回resolved
    const cacheData = await options.cache.getCache(key)
    if(cacheData) return Promise.reject({isDuplicateStatus: true, data: cacheData})
    
    // 单位时间内，存在并发的请求，发送的第一个请求还未返回时，第一个请求的deferred.result 仍然是pedding状态
    // 当pedding状态切换为rejected状态时，会触发onError
    if(this.responseMap.has(key)) {
      const deferred = this.responseMap.get(key)
      if(deferred) {
        return deferred.result
      }
    }

    // 当前key下不存在未结束的请求，创建一个异步触发数据，用于后续的第二个请求获取数据第一个请求的返回结果
    const deferred = new DeferredAsyncValue(params, undefined)
    this.responseMap.set(key, deferred)

    // 超出保活时间时，清除缓存的时间
    setTimeout(() => {
      // 处理删除时，还有等待中的params
      const deferred = this.responseMap.get(key)
      if(deferred) {
        // 如果有请求未结束 将会继续执行，发出实际请求
        deferred.success()
      }
      // 超出保活时间，清除缓存
      this.responseMap.delete(key)
    }, options.cache?.staleTime || 0)

    return params
  }

  async onQueryed(response: any, options: { cache: any }) {
    const { cache } = options

    // 未开启缓存的response，直接放行
    if(!cache) return Promise.resolve(response)

    const { key, cacheTime } = cache || {}
    if(!key) return Promise.resolve(response)

    // 如果responseMap 存在key，表示该结果为第一次请求返回的结果，需要触发responseMap中等待的请求
    if(this.responseMap.has(key)) {
      const deferred = this.responseMap.get(key)
      if(deferred) {
        // 改变deferred为rejected, 并用isDuplicateStatus标记，然后由onError处理
        deferred.fail({
          isDuplicateStatus: true,
          data: response
        })

        // 缓存结果
        if(cacheTime) {
          await options.cache.setCache(key, response, cacheTime)
        }

      }
    }
    return Promise.resolve(response)
  }

  onError(errorData: { isDuplicateStatus: any; data: any }, options: { cache: any }) {
    const { cache } = options

    // 未开启缓存的报错，错误信息直接返回
    if(!cache) return Promise.reject(errorData)

    const { key } = cache || {}

    // isDuplicateStatus 标记为true时，表示返回fulfilled状态
    if (errorData?.isDuplicateStatus) return Promise.resolve(errorData.data)

    // 如果请求报错，放行等待中的请求，让其发送实际请求
    if(this.responseMap.has(key)) {
      const deferred = this.responseMap.get(key)
      if(deferred) {
        deferred.success()
      }
    }
    return Promise.reject(errorData)
  }
}

export default new Duplicate()