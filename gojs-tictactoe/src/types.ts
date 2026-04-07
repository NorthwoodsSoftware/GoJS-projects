import type go from 'gojs';

export type Vec2<T> = [T, T];

// board types
export enum Players {
  None = 0,
  Player1 = 1,
  Player2 = 2,
  Both = 3
}

export type CellValue = Players.None | Players.Player1 | Players.Player2;

export type BoardRow = [CellValue, CellValue, CellValue];

export type Board = [BoardRow, BoardRow, BoardRow];

export type BoardData = {
  board: Board;
  changeSource: 'diagram' | 'board';
  currentPlayer: Players.Player1 | Players.Player2;
  winner: Players;
  winnerIndex: number;
  key?: go.Key;
  parent?: go.Key;
  move: Vec2<number> | null; // row/col
};
