import type { AxiosResponse } from 'axios'

// 返回的数据结构统一拦截处理
export default {
  onQueryed(reason:AxiosResponse) {
    const { data, status } = reason
    if(status === 200 ) {
      // return data
      const { status, data: result } = data
      if(status) {
        return result
      }
    }
    return Promise.reject(reason)
  }
}