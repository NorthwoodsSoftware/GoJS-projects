// A schema for the NodeDataArray
export interface NodeData {
  loc: number[];
  size: number[];
  color: string;
  key: string;
}

export type Axis = 'X' | 'Y' | 'Z';