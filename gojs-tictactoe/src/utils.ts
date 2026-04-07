export function deepCopy<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  const copy = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([key, value]) => {
    (copy as any)[key] = deepCopy(value);
  });

  return copy as T;
}

export function listEquals(arrA: Array<any> | any, arrB: Array<any> | any): boolean {
  if (!Array.isArray(arrA) || !Array.isArray(arrB)) return false;
  if (arrA.length !== arrB.length) return false;

  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return false;
  }

  return true;
}
