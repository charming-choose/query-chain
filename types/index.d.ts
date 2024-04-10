export interface Plugin {
  onQueryBefore?: (params: Params, options: PluginsOptions) => Promise<any>
  onQueryed?: (params: Params, options: PluginsOptions) => Promise<any>
  onError?: (params: Params, options: PluginsOptions) => Promise<any>
}

type Params = Record<string, any>
type PluginsOptions = Record<string, any>

export interface QueryChain<T> {
  use(plugin: Plugin): QueryChain
  query(params: Params, options?: PluginsOptions): Promise<T>
}