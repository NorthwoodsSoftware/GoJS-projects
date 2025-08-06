import type { PairList } from './dataManager.svelte';
import type { ValueTypes } from '$lib/types';

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function avg(arr: number[] | Array<number>): number {
  let sum = 0;

  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }

  return sum / arr.length;
}

const _ValueTypes: Set<ValueTypes> = new Set([
  'string',
  'array',
  'object',
  'number',
  'null',
  'boolean'
]);

export function getType(value: any | PairList): ValueTypes {
  if (value === null || value === undefined) return 'null';

  if (value.isArray !== undefined) {
    if (value.isArray) return 'array';
    else return 'object';
  }

  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (_ValueTypes.has(t)) return t;
  return 'null';
}
