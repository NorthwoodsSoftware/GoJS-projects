/**
 * This file defines the classes used to organize the internal data structure that handles data in
 * a generalized format used to make Nodes, JSON, and the modal editor. This also handles data
 * change event propagation between components.
 */

import type { Unsubscriber } from 'svelte/store';
import type { Key, KeyArray } from './types';

// this is a symbol so that PairList can modify the private property on its Pairs
const KEY = Symbol('PairKey');

// This represents a single key value pair, this is used for both arrays and objects
export class Pair {
  [KEY]: Key;
  value: any;
  parent: PairList | null = null;

  constructor(key: Key, value: any, parent?: PairList) {
    this[KEY] = key;
    this.value = value;
    if (parent) this.parent = parent;
  }

  get key() {
    if (this.parent?.isArray) {
      return this.parent.indexOf(this);
    } else return this[KEY] + ''; // all object keys should be strings
  }

  updateKey(newKey: Key) {
    if (this.key === newKey) return;

    if (this.parent) this.parent.updateKey(this.key, newKey);
    else this[KEY] = newKey;
  }

  equals(otherPair: Pair | any): boolean {
    if (!(otherPair instanceof Pair)) return false;

    if (this.key !== otherPair.key) return false;
    if (this.value !== otherPair.value) return false;

    // parent will be a proxy so it can't be compared
    // if (this.parent !== otherPair.parent) return false;

    return true;
  }
}

// This represents a list of Pairs. Or in other words, JSON objects or arrays
export class PairList implements Iterable<Pair> {
  #isArray: boolean;
  #data: Pair[] = $state([]);
  #mapPair: Map<Key, Pair> = new Map();

  constructor(isArray: boolean) {
    this.#isArray = isArray;
  }

  get isArray() {
    return this.#isArray;
  }
  set isArray(newValue) {
    if (newValue === this.#isArray) return;
    if (typeof newValue !== 'boolean')
      throw new Error(`Expectes isArray to be of type boolean, got: ${newValue}`);

    this.#isArray = newValue;

    // update all the keys in #mapPair if this is now an object
    if (!this.#isArray) {
      this.#mapPair = new Map();
      for (const pair of this.#data) {
        this.#mapPair.delete(pair.key);
        this.#mapPair.set(pair.key, pair);
      }
    }
  }

  /**
   * Index the pair list by the list of keys iteratively. E.g.,
   * PairList.findPairByKey(key[0]).value.findPairByKey(key[1])...
   * @param keys
   * @returns Pair if the key list resolved to one, otherwise null
   */
  resolveKeys(keys: KeyArray): Pair | null {
    if (keys.length === 0) return null;
    let pair = this.findPairByKey(keys[0]);
    if (pair === undefined) return null;

    for (let k of keys.slice(1)) {
      const nextList: PairList | any = pair.value;
      if (!(nextList instanceof PairList)) return null;

      pair = nextList.findPairByKey(k);
      if (pair === undefined) return null;
    }

    return pair;
  }

  indexOf(pair: Pair): number {
    return this.#data.indexOf(pair);
  }

  findPairByIndex(index: number): Pair | undefined {
    return this.#data[index];
  }

  /**
   * Find the Pair object for the given key. If this PairList is an object this
   * will be O(1), if it is an array it will be O(n)
   * @param key key to search for
   * @returns The Pair if it could be found. Otherwise undefined
   */
  findPairByKey(key: Key): Pair | undefined {
    if (this.isArray) {
      if (typeof key !== 'number')
        throw new Error(`key must be a number for isArray PairLists: ${key}`);
      return this.findPairByIndex(key);
    } else return this.#mapPair.get(key);
  }

  /**
   * Add the given Pair to this PairList
   * @param pair element to add
   * @returns index of new element
   */
  push(pair: Pair): number {
    pair.parent = this;
    if (!this.isArray) {
      if (this.#mapPair.has(pair.key))
        throw new Error(`pair with key "${pair}", already exists: ${this.#data}`);
      else this.#mapPair.set(pair.key, pair);
    }
    return this.#data.push(pair);
  }

  forEach(callback: (value: Pair, index: number, array: Pair[]) => void): void {
    this.#data.forEach(callback);
  }

  /**
   * Return true/false if this PairList contains the given key
   * @param key Key to check for
   * @param isStrict Is type strict, default to true. If true then key must be
   * a string for object PairLists or number for array PairLists.
   * @returns boolean
   */
  has(key: Key, isStrict = true): boolean {
    if (this.#isArray && typeof key === 'number') {
      if (isStrict && typeof key !== 'number') return false;
      // check index
      if (this.findPairByIndex(Number(key))) return true;
    } else {
      if (isStrict && typeof key !== 'string') return false;
      // check key
      if (this.findPairByKey(key + '')) return true;
    }

    return false;
  }

  /**
   * Remove the given Pair from this PairList
   * @param pair Pair to remove from this PairList
   * @returns The Pair if successfully removed. Otherwise undefined
   */
  remove(pair: Pair): Pair | undefined {
    if (!this.isArray) {
      this.#mapPair.delete(pair.key);
    }
    const idx = this.#data.indexOf(pair);
    if (idx >= 0) return this.#data.splice(idx, 1)[0];
    else return undefined;
  }

  /**
   * Change a key in this PairList
   * @param oldKey old key
   * @param newKey new key
   */
  updateKey(oldKey: Key, newKey: Key): void {
    if (oldKey === newKey) return;
    if (this.isArray)
      throw new Error(`can't update a key in an array PairList: ${oldKey}, ${newKey}`);

    const p = this.#mapPair.get(oldKey);
    if (p === undefined) throw new Error(`Couldn't find old key: ${oldKey}`);

    if (this.#mapPair.get(newKey)) throw new Error(`new key is already in use: ${newKey}`);
    this.#mapPair.set(newKey, p);
    this.#mapPair.delete(oldKey);
    p[KEY] = newKey;
  }

  // This will deep copy but it could only copy levels as they are accessed/modified to be more efficient
  /**
   * Make a deep copy of this PairList
   * @returns copy
   */
  copy(): PairList {
    const newList = new PairList(this.isArray);

    this.#data.forEach(p => {
      const newP = new Pair(p.key, null, newList);

      if (p.value instanceof PairList) {
        newP.value = p.value.copy();
      } else {
        newP.value = p.value;
      }

      newList.push(newP);
    });

    return newList;
  }

  get length(): number {
    return this.#data.length;
  }

  // allow svelte to iterate over this
  [Symbol.iterator](): Iterator<Pair> {
    return this.#data[Symbol.iterator]();
  }
}

export class DataManager {
  data: PairList = $state(new PairList(false));
  #preListeners: Function[] = [];
  #postListeners: Function[] = [];
  #lastWriteTime: Date | null = null;
  #completedTimeout: NodeJS.Timeout | null = null;

  /**
   * Handles internal storage of data and propagating changes to listeners
   * @param obj Optional object to initialize the data manager with
   */
  constructor(obj?: Object) {
    if (obj == null) return;
    if (Array.isArray(obj)) this.data.isArray = true;
    else this.data.isArray = false;
    this.#fromObject(obj, this.data);
  }

  /**
   * Modify the data with the given PairList
   * @param newPairs PairList to write to data
   * @param keyPath Path to the location of the change. Defaults to root
   * @param reason The reason/source of the change
   * @returns promise, resolves how long the update took in milliseconds once
   * it is complete
   */
  updateData(newPairs: PairList, keyPath: KeyArray = [], reason: string = ''): Promise<number> {
    // update all this subscribed listeners

    // loading indicator
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.remove('complete');
      loading.style.display = '';
    }

    return new Promise((res, rej) => {
      // RAF and timeout to allow loading indicator to become visible before starting this operation

      window.requestAnimationFrame(() => {
        // remove existing timeout if there is one

        window.requestAnimationFrame(() => {
          const startTime = performance.now();
          // notify pre listeners
          this.#preListeners.forEach(l => l(newPairs, keyPath, reason));

          // update this.data
          if (keyPath && keyPath.length) {
            let currentData: PairList | undefined = this.data;
            for (let i = 0; i < keyPath.length - 1; i++) {
              currentData = currentData.findPairByKey(keyPath[i])?.value;
              if (currentData === undefined) {
                rej();
                throw new Error(`Could not find data for path: ${keyPath}`);
              }
            }

            const pair = currentData.findPairByKey(keyPath.at(-1)!);
            if (!pair) {
              rej();
              throw new Error(`Could not find data for path: ${keyPath}`);
            }

            pair.value = newPairs;
          } else {
            this.data = newPairs;
          }

          // notify post listeners
          this.#postListeners.forEach(l => l(newPairs, keyPath, reason));

          // handle loading animation
          if (loading) {
            requestAnimationFrame(() => {
              if (loading.classList.contains('complete')) return;
              // if the loading is visible then don't immediately hide it, this is mostly to prevent flickering
              if (Number(getComputedStyle(loading).opacity) > 0.07) {
                loading.classList.add('complete');
                if (this.#completedTimeout !== null) clearTimeout(this.#completedTimeout);
                this.#completedTimeout = setTimeout(() => {
                  // if another animation started then cancel this
                  if (!loading.classList.contains('complete')) return;
                  loading.classList.remove('complete');
                  loading.style.display = 'none';
                  this.#completedTimeout = null;
                }, 1000);
              } else {
                loading.style.display = 'none';
              }
            });
          }

          this.#lastWriteTime = new Date();
          res(performance.now() - startTime);
        });
      });
    });
  }

  /**
   * Modify the data with the given object
   * @param newObject Object to write to data
   * @param keyPath Path to the location of the change. Defaults to root
   * @param reason The reason/source of the change
   */
  updateDataFromObject(newObject: any, keyPath?: KeyArray, reason?: string): Promise<number> {
    if (newObject === null || typeof newObject !== 'object') {
      // don't pass on primitives
      newObject = { '': newObject };
    }

    const pairs = new PairList(Array.isArray(newObject));
    this.#fromObject(newObject, pairs);
    return this.updateData(pairs, keyPath, reason);
  }

  /**
   * Modify the data with the given JSON
   * @param newJSON JSON to write to data
   * @param keyPath Path to the location of the change. Defaults to root
   * @param reason The reason/source of the change
   * @returns true/false if the JSON was valid
   */
  updateDataFromJSON(newJSON: string, keyPath?: KeyArray, reason?: string): boolean {
    let newObject;
    try {
      newObject = JSON.parse(newJSON);
    } catch {
      return false;
    }

    this.updateDataFromObject(newObject, keyPath, reason);
    return true;
  }

  /**
   * Run the given function when data is modified
   * @param func Change listener function
   * @param isNotifiedBeforeChange true/false if listener is called before or
   * after the change
   * @returns Unsubscribe function
   */
  subscribe(
    func: (newPairs: PairList, keyPath: KeyArray, reason: string) => void,
    isNotifiedBeforeChange: boolean
  ): Unsubscriber {
    // update subscriber right away if there is new data
    if (this.#lastWriteTime !== null) func(this.data, [], '');

    // save the index the subscriber was inserted at. If a subscriber that was before it in the list
    // was removed first then its index will have changed. In that case idx = indexOf()
    if (isNotifiedBeforeChange) {
      const maybeIDX = this.#preListeners.length;
      this.#preListeners.push(func);
      return () => {
        const idx =
          this.#preListeners[maybeIDX] === func ? maybeIDX : this.#preListeners.indexOf(func);
        if (idx < 0) return;
        this.#preListeners.splice(idx, 1);
      };
    } else {
      const maybeIDX = this.#postListeners.length;
      this.#postListeners.push(func);
      return () => {
        const idx =
          this.#postListeners[maybeIDX] === func ? maybeIDX : this.#postListeners.indexOf(func);
        if (idx < 0) return;
        this.#postListeners.splice(idx, 1);
      };
    }
  }

  /**
   * Add the given object/lists key/index value pairs to the given pair list
   * @param obj Object or Array to get entries from
   * @param pairs Pairs to add entries to
   */
  #fromObject(obj: Object | Array<any>, pairs: PairList): void {
    (Array.isArray(obj) ? obj.entries() : Object.entries(obj)).forEach(([k, v]) => {
      if (typeof k !== 'number' && typeof k !== 'string')
        throw new Error(`key must be string or number. "${k}": ${typeof k}`);
      if (typeof k === 'number') k = -1;

      if (typeof v === 'object' && v !== null) {
        const arr = new PairList(Array.isArray(v));
        this.#fromObject(v, arr);
        pairs.push(new Pair(k, arr, pairs));
      } else {
        pairs.push(new Pair(k, v, pairs));
      }
    });

    this.#lastWriteTime = new Date();
  }

  /**
   * Get the Date object from the last time data was written to the data manager
   * @returns Date of last write
   */
  getLastWriteTime(): Date {
    return this.#lastWriteTime ? new Date(this.#lastWriteTime) : new Date(0);
  }

  /**
   * Convert this data structure into a generic JS object
   * @returns Object from data
   */
  toObject(): Object | Array<any> {
    return this.#toObject(this.data);
  }

  /**
   * Private helper function for toObject
   * @param pairs Pair list to convert
   * @returns Object from pair list
   */
  #toObject(pairs: PairList): Object | Array<any> {
    if (pairs.isArray) {
      const arr: Array<any> = [];

      pairs.forEach(p => {
        if (p.value?.['isArray'] !== undefined) arr.push(this.#toObject(p.value));
        else arr.push(p.value);
      });

      return arr;
    } else {
      const obj: any = {};

      pairs.forEach(p => {
        if (p.value?.['isArray'] !== undefined) obj[p.key] = this.#toObject(p.value);
        else obj[p.key] = p.value;
      });

      return obj;
    }
  }

  /**
   * Convert the data structure into a JSON string
   * @param spaces Adds indentation, white space, and line break characters to
   * the return-value JSONtext to make it easier to read.
   * @returns Stringified object
   */
  toJSON(spaces: number = 2): string {
    return JSON.stringify(this.toObject(), null, spaces);
  }
}
