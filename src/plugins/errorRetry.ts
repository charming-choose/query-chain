import { sleep } from '../utils/common'
const def_options = {
  count: 3, // 重试次数
  _retryCount: 0, // 当前查询次数
  interval: 300, // 重试间隔时间（ms）
  checkError: (d: any) => d // 判断是否错误
}

export default {

  // 查询前, 初始化默认参数
  onQueryBefore(params: any, options: { errorRetry: any }) {
    // 未开启错误重试，直接返回params
    if(!options?.errorRetry) return params

    const { errorRetry } = options

    options.errorRetry = {
      ...def_options,
      ...errorRetry
    }

    return params

  },

  // 查询后
  async onQueryed(result: any, options: { errorRetry: { checkError: (arg0: any) => any } }) {
    if(!options?.errorRetry) return result

    const isError = await options.errorRetry.checkError(result)
    if(!isError) return result
    return Promise.reject(result)

  },

  // 监听查询中的报错
  async onError(error: any, options: { errorRetry: { checkError?: any; _retryCount: any; count?: any; interval?: any }; _params: any; _queryChain: { query: (arg0: any, arg1: any) => any } }) {
    if(!options?.errorRetry) return Promise.reject(error)
    
    const isError = await options.errorRetry.checkError(error)
    if(!isError) return error

    const { count, _retryCount, interval } = options.errorRetry
    debugger
    if(_retryCount >= count) return Promise.reject(error)

    if(interval) await sleep(interval)
    
    options.errorRetry._retryCount  = _retryCount + 1
    const params = options._params
    
    return options._queryChain.query(params, options)
  }
  
}