import type { Pair, PairList } from './dataManager.svelte';

export type ValueTypes = 'string' | 'array' | 'object' | 'number' | 'null' | 'boolean';

export type Key = number | string;
export type KeyArray = Array<Key>;

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export type PairLike = {
  key: Key;
  value: string | number | null | boolean | PairList;
};

export type NodeData = {
  isArray: boolean;
  key: string;
  hueRange: Vec2;
  label: string;
  props: PairLike[];
};

export type KeyInputBinding = { input: HTMLInputElement; pair: Pair };
