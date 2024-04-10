import { Message } from 'element-ui'

// 错误信息统一弹窗
export default {
  onQueryed(result) {
    const code = result?.data
    if(code === 200) return Promise.resolve(result)

    return Promise.reject(result)
  },
  onError(result) {
    let errMes = ''
    if(!result?.response?.status) {
      errMes = '404'
    }
    
    Message({
      message: errMes || '接口错误',
      type: 'error'
    })
    return Promise.reject(result)
  }
}
