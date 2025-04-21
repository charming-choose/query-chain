export type Params = Record<string, any> // 请求参数
export type Response = any // 请求返回值
export type PluginsOptions = Record<string, any> // 插件配置

export type Fetch = (...arg: any[]) => Promise<any> // 请求方法

export const Before = 'queryBefore' as const
export const Querying = 'queryAfter' as const
export const After = 'dealResponse' as const

export type Stage = typeof Before | typeof Querying | typeof After

export interface Plugin {
  name?: string,
  onQueryBefore?: (params: Params, options: PluginsOptions) => Promise<any>
  onQueryed?: (params: Params, options: PluginsOptions) => Promise<any>
  onError?: (params: Params, options: PluginsOptions, stage: Stage) => Promise<any>
}

export interface TypeQueryChain<T> {
  use(plugin: Plugin): QueryChain<T>
  query(params: Params, options?: PluginsOptions): Promise<T>
}

export default class QueryChain<T> {
  private plugins: Plugin[]
  private fetch: Fetch

  constructor(fetch: Fetch)

  // 注册插件
  use(plugin: Plugin): QueryChain<T>

  // before 拦截
  private queryBefore(params: Params, pluginParams: PluginsOptions): Promise<[Params, any, any]>

  // error 拦截
  private queryError(errorData: Params, pluginParams: PluginsOptions, stage: Stage): Promise<any>

  // 执行 query
  private querying(params: Params, response: Params, pluginParams: PluginsOptions): Promise<[Response, any]>

  // response 拦截
  private queryAfter(response: Response, pluginParams: PluginsOptions): Promise<[Response, any]>

  query(params: Params, pluginParams?: PluginsOptions): Promise<T>
}

// 插件导出
export const concurrency: Plugin
export const duplicate: Plugin
export const errorRetry: Plugin
