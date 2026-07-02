import * as Y from 'yjs';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function avg(arr: number[] | Array<number>): number {
  let sum = 0;

  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }

  return sum / arr.length;
}

export function objectifyYJS(yObj: Y.Map<any>): object | Array<any> {
  if (typeof yObj !== 'object' || yObj === null) return yObj;
  if (!(yObj instanceof Y.AbstractType)) return yObj;
  if (typeof yObj.keys !== 'function') return yObj;
  if (typeof yObj.values !== 'function') return yObj;
  if (typeof yObj.entries !== 'function') return yObj;

  const o: go.ObjectData = {};

  for (const [key, value] of yObj.entries()) {
    o[key] = objectifyYJS(value);
  }

  return o;
}
