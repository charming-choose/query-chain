import * as localforage from 'localforage'
import { isEmpty } from './common'

export class Localforage {
  store = localforage
  constructor(store=localforage){
    this.store = store
  }
  set(key: any, value: any, time: number) {
    if(time > 0) {
      return this.store.setItem(key, JSON.stringify({
        value,
        _cacheTime: time + + new Date()
      }))
    }

    return this.store.setItem(key, JSON.stringify(value))
  }

  async get(key: any) {
    const result:any = await this.store.getItem(key)
    try {
      const data = JSON.parse(result)

      if(typeof data?._cacheTime == 'undefined') return data

      const now = + new Date()
      if(data._cacheTime - now <= 0 ) {
        this.remove(key)
        return
      }
      return data.value
    } catch(_e) {
      return
    }
  }

  async has(key: any) {
    const status = await this.get(key)
    return isEmpty(status)
  }

  remove(key: any) {
    return this.store.removeItem(key)
  }

  clear() {
    return this.store.clear()
  }
}


export default new Localforage()