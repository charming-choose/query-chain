import * as hashjs from 'hash.js'

export const isEmpty = (val: any): boolean => !val;

export const isFunction = (fn: any): fn is Function => typeof fn === 'function';

export const isObject = (arg: any): arg is Record<string, any> => arg !== null && typeof arg === 'object';

export const isPromise = (arg: any): arg is Promise<any> => isObject(arg) && isFunction(arg?.then) && isFunction(arg?.catch)

export function sleep(time:number) {
  return new Promise( (resolve) => {
    window.setTimeout(() => {
      resolve(undefined)
    }, time)
  })
}

type DealData = [null, any] | [any, null]
export function asyncData(promiseData: any): Promise<DealData> {
  return new Promise((resolve) => {
    if(!isPromise(promiseData)) return resolve([promiseData, undefined])

    promiseData.then(res => {
      resolve([res, undefined])
    }).catch(err => {
      resolve([undefined, err])
    })

  })
}

export function getUnniKey(obj:any) {
  const jsonString = JSON.stringify(obj)
  const sha256 = hashjs.sha256()
  sha256.update(jsonString)
  return sha256.digest('hex')
}