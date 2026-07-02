import type * as Y from 'yjs';
// import * as Y from 'yjs';
import type { TypedMap } from 'yjs-types';

export type Vec3<T> = [T, T, T];
export type Vec2<T> = [T, T];

type CategoryToType = {
  [DataType.Node]: YNodeData;
  [DataType.Client]: YClientData;
  [DataType.SelectionBounds]: YSelectionData;
};

export function isCategory<C extends DataType>(
  map: YNodeData | YClientData | YSelectionData,
  category: C
): map is CategoryToType[C] {
  return (map as any).get('category') === category;
}

type CleanupFunction = () => void;
export type DocSyncFunction = (
  doc: Y.Doc,
  disconnectListener: (clientID: number) => void
) => CleanupFunction;

export enum DataType {
  Node = 'Node',
  Client = 'Client',
  SelectionBounds = 'SelectionBounds'
}

// generic for all data
type Data = {
  category: DataType;
  key: string | number;
  isDeleted: boolean;
};
export type YGenericData = TypedMap<Data>;

// client selection box
export type SelectionData = Data & {
  ownerID: number;
  location: string;
  width: number;
  height: number;
};
export type YSelectionData = TypedMap<SelectionData>;

// client cursor
export type ClientData = Data & {
  location: string;
  hue: number;
  key: number;
};
export type YClientData = TypedMap<ClientData>;

// node data
export type NodeData = Data & {
  selectedBy?: number[]; // client ID
  lastModifiedBy?: number; // client id
  text: string;
  color: string;
  group?: string;
  location: string;
  key: string;
};
export type YNodeData = TypedMap<NodeData>;

export type YNodes = TypedMap<{ [key: string]: YNodeData | YClientData | YSelectionData }>;

// link data
export type LinkData = Data & {
  selectedBy?: number[]; // client ID
  lastModifiedBy?: number; // client id
  key: string;
  to: string;
  from: string;
};
export type YLinkData = TypedMap<LinkData>;

export type YLinks = TypedMap<{ [key: string]: YLinkData }>;

export type YAnyData = YNodeData | YClientData | YSelectionData | YLinkData;
