import { asyncData, isFunction } from './utils/common'
export * from './utils/deferredAsyncValue'

type Params = Record<string, any>
type PluginsOptions = Record<string, any>


export interface Plugin {
  onQueryBefore?: (params: Params, options: PluginsOptions) => Promise<any>
  onQueryed?: (params: Params, options: PluginsOptions) => Promise<any>
  onError?: (params: Params, options: PluginsOptions) => Promise<any>
}

export default class QueryChain<T> {
  private plugins: Plugin[] = []
  fetch = null

  constructor(fetch:any) {
    this.fetch = fetch
  }

  // 注册插件
  use(plugin: Plugin) {
    this.plugins.push(plugin)
    return this
  }

  // before 拦截
  private queryBefore(params:Params, pluginParams:PluginsOptions) {
    return new Promise( async (resolve) => {
      for(let plugin of this.plugins) {

        // 如果该插件未注册 onQueryBefore hook，跳过该循环
        if(!isFunction(plugin.onQueryBefore)) continue
        
        // 执行 onQueryBefore hook 方法
        const [ newParams, paramsError ] = await asyncData(plugin.onQueryBefore(params, pluginParams))

        // 如果未报错，赋值至新的params
        if(!paramsError) {
          params = newParams ?? params

        // 如果出现报错，触发onError hook, 并终止循环
        } else {
          const [ paramsResponse, resultError ] = await asyncData(this.queryError(paramsError, pluginParams))
          return resolve([ , paramsResponse, resultError ])
        }
      }
      resolve([ params ])
    })
  }

  // error 拦截
  private queryError(errorData: Params, pluginParams: PluginsOptions) {
    return new Promise( async (resolve, reject) => {
      for(let plugin of this.plugins) {

        // 如果该插件未注册 onQueryBefore hook，跳过该循环
        if(!isFunction(plugin.onError)) continue

        const [ result, error ] = await asyncData(plugin.onError(errorData, pluginParams))

        // 如果onError返回kong
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
  private querying(params:Params, response: Params, pluginParams:PluginsOptions){

    return new Promise( async (resolve) => {
      if(response) return resolve([ response ])
      // 执行fetch
        // @ts-ignore
      const [ newResponse, responseError ] = await asyncData(this.fetch(params))

      // 如果 fetch 返回 fulfilled，返回正确的结果
      if(!responseError) return resolve([ newResponse ])

      const [ queryResponse, queryError ] = await asyncData(this.queryError(responseError, pluginParams))

      return resolve([ queryResponse, queryError ])

    })
  }

  // 后置拦截
  private queryAfter(response:Params, pluginParams:PluginsOptions) {
    return new Promise( async (resolve) => {
      for(let plugin of this.plugins) {

        // 如果该插件未注册 onQueryed hook，跳过该循环
        if(!isFunction(plugin.onQueryed)) continue
        
        // 执行 onQueryed hook 方法
        const [ newResponse, responseError ] = await asyncData(plugin.onQueryed(response, pluginParams))

        // 如果未报错，赋值至新的response
        if(!responseError) {
          response = newResponse ?? response

        // 如果出现报错，触发onError hook, 并终止循环
        } else {
          const [ resultResponse, resultError ] = await asyncData(this.queryError(responseError, pluginParams))
          return resolve([ resultResponse, resultError ])
        }
      }
      resolve([ response ])
    })
  }

  async query(params:Params, pluginParams={}): Promise<T> {

    const options:PluginsOptions = Object.assign(pluginParams, {
      _params: params,
      _queryChain: this
    })

    // 前置拦截
    // @ts-ignore
    const [ params1, response1, error1 ] = await this.queryBefore(params, options)
    
    if(error1) return Promise.reject(error1)
    
    // 查询
    // @ts-ignore
    const [ response2, error2 ] = await this.querying(params1, response1, options)
    
    if(error2) return Promise.reject(error2)
    
    // 查询结果拦截
    // @ts-ignore
    const [ response3, error3 ] = await this.queryAfter(response2, options)

    if(error3) return Promise.reject(error3)

    // 返回最终结果
    return response3
  
  }
}
