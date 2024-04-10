import { getUnniKey } from '../utils/common'
import storage from '../utils/storage'
import DeferredAsyncValue from '../utils/deferredAsyncValue'


const def_options = {
  cacheKey: 'duplicateKey', // 缓存的key
  cacheTime: 15 * 60 * 1000, // 缓存的时间（ms）
  staleTime: 10 * 1000, // 保鲜的时间（ms）
  setCache: storage.set.bind(storage),
  getCache: storage.get.bind(storage)
}

// 缓存结果
export class Duplicate {
  responseMap = new Map()

  async onQueryBefore(params: any, options: { cache: any }) {
    // 未开启缓存，直接返回params
    if(!options?.cache) return params

    const { cache } = options

    let { cacheKey } = cache

    if(typeof cacheKey === 'function') cacheKey = cacheKey(params)
    if(!cacheKey) cacheKey = getUnniKey(params)

    options.cache = {
      ...def_options,
      ...cache,
      cacheKey
    }

    // 缓存中存在key对应的数据，直接返回
    const cacheData = await options.cache.getCache(cacheKey)
    console.log('>>>>>', cacheKey, cacheData)
    if(cacheData) return Promise.reject({isDuplicateStatus: true, data: cacheData})
    
    // 单位时间内，存在并发的请求，发送的第一个请求还未返回时，第二个请求pedding状态
    // 当pedding状态切换为rejected状态时，会触发onError
    if(this.responseMap.has(cacheKey)) {
      const deferred = this.responseMap.get(cacheKey)
      if(deferred) {
        return deferred.result
      }
    }

    // 当前不存在同key的请求时
    // params为deferred状态为 fulfilled 的默认返回值
    const deferred = new DeferredAsyncValue(params, undefined)
    this.responseMap.set(cacheKey, deferred)

    // 超出保活时间时
    setTimeout(() => {
      // 处理删除时，还有等待中的params
      const deferred = this.responseMap.get(cacheKey)
      if(deferred) {
        // 如果有请求未结束将会继续执行，发出实际请求
        deferred.success()
      }
      // 超出保活时间，清除缓存
      this.responseMap.delete(cacheKey)
    }, options.cache?.staleTime || 0)

    return params
  }

  async onQueryed(result: any, options: { cache: any }) {
    const { cache } = options

    // 未开启缓存的报错，直接返回
    if(!cache) return Promise.resolve(result)

    const { cacheKey, cacheTime } = cache

    // 如果responseMap 存在key，表示该结果为第一次请求返回的结果，需要触发responseMap等待的请求
    if(this.responseMap.has(cacheKey)) {
      const deferred = this.responseMap.get(cacheKey)
      if(deferred) {
        // 改变deferred为rejected
        deferred.fail({
          isDuplicateStatus: true,
          data: result
        })

        // 缓存结果
        if(cacheTime) {
          await options.cache.setCache(cacheKey, result, cacheTime)
        }

      }
    }
    return Promise.resolve(result)
  }

  onError(errorData: { isDuplicateStatus: any; data: any }, options: { cache: any }) {
    const { cache } = options

    // 未开启缓存的报错，错误信息直接返回
    if(!cache) return Promise.reject(errorData)

    const { cacheKey } = cache

    // isDuplicateStatus 标记为true时，表示返回fulfilled状态
    if (errorData?.isDuplicateStatus) return Promise.resolve(errorData.data)

    // 如果设置了缓存，但是没有等到结果时，触发等待的请求，让其继续执行，重新发送请求
    if(this.responseMap.has(cacheKey)) {
      const deferred = this.responseMap.get(cacheKey)
      if(deferred) {
        deferred.success()
      }
    }
    return Promise.reject(errorData)
  }
}

export default new Duplicate()