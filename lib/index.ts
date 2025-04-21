import { asyncData, isFunction } from './utils/common'
export { default as concurrency } from './plugins/concurrency' // 请求并发控制
export { default as duplicate } from './plugins/duplicate' // 重复请求合并 请求缓存
export { default as errorRetry } from './plugins/errorRetry' // 请求报错自动重试

type Params = Record<string, any> // 请求参数
type Response = any // 请求返回值
type PluginsOptions = Record<string, any> // 插件配置

type Fetch = (...arg: any[]) => Promise<any> // 请求方法

const Before = 'queryBefore' as const
const Querying = 'queryAfter' as const
const After = 'dealResponse' as const

type Stage = typeof Before | typeof Querying | typeof After

export interface Plugin {
  name?: string,
  onQueryBefore?: (params: Params, options: PluginsOptions) => Promise<any>
  onQueryed?: (params: Params, options: PluginsOptions) => Promise<any>
  onError?: (params: Params, options: PluginsOptions, stage: Stage) => Promise<any>
}

export default class QueryChain<T> {
  private plugins: Plugin[] = []
  private fetch: Fetch

  constructor(fetch: Fetch) {
    this.fetch = fetch
  }

  // 注册插件
  use(plugin: Plugin) {
    this.plugins.push(plugin)
    return this
  }

  // before 拦截
  private queryBefore(params: Params, pluginParams:PluginsOptions): Promise<[Params, any, any]> {
    return new Promise( async (resolve) => {
      for(let plugin of this.plugins) {

        // 如果该插件未注册 onQueryBefore hook，跳过该循环
        if(!isFunction(plugin.onQueryBefore)) continue
        
        // 执行 onQueryBefore hook 方法
        const [ newParams, paramsError ] = await asyncData(plugin.onQueryBefore(params, pluginParams))

        // 如果未报错，赋值params
        if(!paramsError) {
          params = newParams ?? params
        
        // 报错
        
        // 该插件存在 onError hook 方法
        } else if(isFunction(plugin.onError)) {
          const [ response, dealError ] = await asyncData(plugin.onError(params, pluginParams, Before))
          
          // 经过onError hook 方法处理后，如果未报错，跳过querying阶段，将直接触发afterQueryed方法
          if(!dealError) {
            return resolve([ params, response, null ])
          // 如果onError 仍然返回一个错误，将会跳过querying、queryafter阶段，直接error结果
          } else {
            return resolve([ params, null, dealError ])
          }
          
        // 该插件不存在onError hook 方法, 将会跳过querying、queryafter阶段，直接error结果
        } else {
          return resolve([ params, null, paramsError ])
        }
      }
      resolve( [params, null, null ])
    })
  }

  // error 拦截
  private queryError(errorData: Params, pluginParams: PluginsOptions, stage: Stage): Promise<any> {
    return new Promise( async (resolve, reject) => {
      for(let plugin of this.plugins) {

        // 如果该插件未注册 onQueryBefore hook，跳过该循环
        if(!isFunction(plugin.onError)) continue

        const [ result, error ] = await asyncData(plugin.onError(errorData, pluginParams, stage))

        // 如果onError返回空
        if(!error && !result) {
          errorData = error ?? errorData
          continue
        }

        // 如果 onError 返回 fulfilled，将直接结束，并将错误返回
        if(!error) {
          resolve(result)
          break

        // 如果 onError 返回 rejected
        } else {
          errorData = error ?? errorData
        }
      }
      reject(errorData)
    })
  }

  // 执行 query
  private querying(params: Params, response: Params, pluginParams: PluginsOptions): Promise<[Response, any]>{

    return new Promise( async (resolve) => {
      // 存在结果 直接返回 跳过querying
      if(response) return resolve([ response, null ])
        
      // 执行fetch
      const [ newResponse, responseError ] = await asyncData(this.fetch(params))

      // 如果 fetch 返回 Response
      if(!responseError) return resolve([ newResponse, null ])

      // 报错
      const [ queryResponse, queryError ] = await asyncData(this.queryError(responseError, pluginParams, Querying))

      return resolve([ queryResponse, queryError ])

    })
  }

  // response 拦截
  private queryAfter(response: Response, pluginParams: PluginsOptions): Promise<[Response, any]> {
    return new Promise( async (resolve) => {
      for(let plugin of this.plugins) {

        // 如果该插件未注册 onQueryed hook，跳过该循环
        if(!isFunction(plugin.onQueryed)) continue
        
        // 执行 onQueryed hook 方法
        const [ newResponse, responseError ] = await asyncData(plugin.onQueryed(response, pluginParams))

        // 如果未报错，赋值至新的response
        if(newResponse) {
          response = newResponse ?? response

        // 如果出现报错，触发onError hook, 并终止循环
        } else if(isFunction(plugin.onError)) {
          const [ resultResponse, resultError ] = await asyncData(plugin.onError(responseError, pluginParams, After))

          // 经过onError hook 方法处理后，如果未报错, 返回正确的结果
          if(resultResponse) {
            return resolve([ resultResponse, null ])
          // 如果onError 仍然返回一个错误，直接error结果
          } else {
            return resolve([ null, resultError ])
          }

        // 该插件不存在onError hook 方法，直接error结果
        } else {
          return resolve([ null, responseError ])
        }
      }
      resolve([ response, null ])
    })
  }

  async query(params:Params, pluginParams={}): Promise<T> {

    const options:PluginsOptions = Object.assign(pluginParams, {
      _params: params,
      _queryChain: this
    })

    // 前置拦截
    const [ params1, response1, error1 ] = await this.queryBefore(params, options)
    
    if(error1) return Promise.reject(error1)
    
    // 查询
    const [ response2, error2 ] = await this.querying(params1, response1, options)
    
    if(error2) return Promise.reject(error2)
    
    // 查询结果拦截
    const [ response3, error3 ] = await this.queryAfter(response2, options)

    if(error3) return Promise.reject(error3)

    // 返回最终结果
    return response3
  
  }
}
