const Resolved = 'resolved'
const Rejected = 'rejected'
const Pending = 'pending'

// 定义异步操作的三种状态
export type DeferredStatus = typeof Resolved | typeof Rejected | typeof Pending

// 定义异步操作后的回调函数类型
export type Callback<T> = (value?: T) => void

// 定义 deferredAsyncValue 类型，包含泛型 T 和 U，可根据需求自定义默认值类型
export interface TypeDeferredAsyncValue<T = any, U = any> {
  result: Promise<T>
  success: (arg?: T) => void
  fail: (arg?: U) => void
}

export default class DeferredAsyncValue<T = any , U = any> {
  private value?: T // 默认值
  private error?: U // 失败原因的默认值
  private resolveCb: Callback<T> | null // 成功回调
  private rejectCb: Callback<U> | null // 失败回调
  private status: DeferredStatus = Pending // 当前返回的值的状态

  constructor(defaultValue?: T, defaultReason?: U){
    this.value = defaultValue
    this.error = defaultReason
    this.resolveCb = null
    this.rejectCb = null
  }

  // 获取异步操作最终执行结果，返回的是一个Promise
  get result(): Promise<T | undefined> {
    return this.waitForResolved()
  }

  // 返回一个 Promise，等待异步操作执行完毕并返回操作最终执行
  waitForResolved(): Promise<T | undefined> {
    switch(this.status) {
      case Resolved:
        return Promise.resolve(this.value)
      case Rejected:
        return Promise.reject(this.error)
      case Pending:
        return new Promise((resolve, reject) => {
          // 由于每次获取result时，都会创建一个new Promise, 
          // 所以这里收集Promise的状态change事件，在success或fail方式时触发收集的回调
          this.addCallback(resolve, reject)
        })
    }
  }

  // 收集回调，resolve或者reject的回调
  addCallback(onResolved: Callback<T>, onRejected: Callback<U>): void {
    if (this.resolveCb === null) {
      this.resolveCb = onResolved
    } else {
      const _resolveCb = this.resolveCb
      this.resolveCb = (value?: T) => {
        _resolveCb(value)
        onResolved(value)
      }
    }

    if (this.rejectCb === null) {
      this.rejectCb = onRejected
    } else {
      const _rejectCb = this.rejectCb
      this.rejectCb = (reason?: U) => {
        _rejectCb(reason)
        onRejected(reason)
      }
    }
  }

  // 执行回调列表中的resolve回调函数
  runResolveCallbacks(value?: T): void {
    if (this.status === Pending && this.resolveCb != null) {
      this.status = Resolved
      this.resolveCb(value)
      this.resolveCb = null
    }
  }
  
  // 执行回调列表中的reject回调函数
  runRejectCallbacks(reason?: U): void {
    if (this.status === Pending && this.rejectCb != null) {
      this.status = Rejected
      this.rejectCb(reason)
      this.rejectCb = null
    }
  }

  // 调用success时，result方法返回的Promise对象change为resolved
  success(value?: T): void {
    if (this.status === Pending) {
      this.value = (value === undefined || value === null) ? this.value : value
      this.runResolveCallbacks(this.value)
    }
  }
  
  // 调用fail时，result方法返回的Promise对象change为rejected
  fail(reason?: U): void {
    if (this.status === Pending) {
      this.error = (reason === undefined || reason === null) ? this.error : reason
      this.runRejectCallbacks(this.error)
    }
  }
}