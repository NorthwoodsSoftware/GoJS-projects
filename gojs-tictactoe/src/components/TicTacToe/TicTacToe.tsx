import { type Dispatch } from 'react';
import type { BoardData, Board, CellValue } from '../../types';
import { Players } from '../../types';
import { deepCopy } from '../../utils';
import { type MouseEventHandler } from 'react';

// width of strike through line
const strikeWidth = '0.33rem';

// degrees of randomness to add to strike through line
const minAngle = 2.5;
const maxAngle = 5.5;

// return who won and in what way
function getWinner(board: Board): [Players, number] {
  const flat = board.flat();
  const lines = [
    [0, 1, 2], // vertical 0
    [3, 4, 5], // vertical 1
    [6, 7, 8], // vertical 2
    [0, 3, 6], // horizontal 0
    [1, 4, 7], // horizontal 1
    [2, 5, 8], // horizontal 2
    [0, 4, 8], // diagonal 0
    [2, 4, 6] // diagonal 1
  ];

  // check if a winning move has been made
  for (let i = 0; i < lines.length; i++) {
    let [a, b, c] = lines[i];
    if (flat[a] !== Players.None && flat[a] === flat[b] && flat[a] === flat[c]) {
      return [flat[a], i];
    }
  }

  // check if this is a draw
  if (flat.every(cell => cell !== Players.None)) {
    return [Players.Both, NaN];
  }

  return [Players.None, NaN];
}

function Cell({
  value,
  onClick
}: {
  value: CellValue;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div className="bg-board-primary p-0">
      <button
        className="m-1 flex h-15 w-15 items-center justify-center rounded-md hover:bg-zinc-700/75 dark:hover:bg-zinc-300/75"
        onClick={onClick}
      >
        {value !== Players.None &&
          (value === Players.Player1 ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="var(--board-text)"
              viewBox="0 0 256 256"
            >
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="var(--board-text)"
              viewBox="0 0 256 256"
            >
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z"></path>
            </svg>
          ))}
      </button>
    </div>
  );
}

// these functions get the position and rotation of the strike through line
function getTop(idx: number): string {
  const off = `calc(${strikeWidth} * 1/4)`;
  if (idx < 3) return `calc(${((idx * 2 + 1) / 6) * 100}% - ${off})`;
  if (idx < 6) return '50%';
  return `calc(50% - ${off})`;
}

function getLeft(idx: number): string {
  const off = `calc(${strikeWidth} * 1/4)`;
  if (idx < 3) return '50%';
  if (idx < 6) return `calc(${(((idx - 3) * 2 + 1) / 6) * 100}% - ${off})`;
  return `calc(50% - ${off})`;
}

function getRotate(idx: number): string {
  let deg = -45;
  if (idx < 3) deg = 0;
  else if (idx < 6) deg = 90;
  else if (idx === 6) deg = 45;

  const r = (Math.random() * (maxAngle - minAngle) + minAngle) * (Math.random() > 0.5 ? -1 : 1);
  deg += r;

  return `${deg}deg`;
}

export default function TicTacToe({
  boardData,
  setBoardData
}: {
  boardData: BoardData;
  setBoardData: Dispatch<BoardData>;
}) {
  return (
    <div className="relative aspect-square h-fit w-fit min-w-[210px]">
      {/* board */}
      <div className="bg-board-secondary grid h-fit w-fit grid-rows-3 gap-[2px]">
        {boardData.board.map((row, i) => (
          <div key={i} className="grid w-fit grid-cols-3 gap-[2px]">
            {row.map((cell, j) => (
              <Cell
                key={j}
                value={cell}
                onClick={() => {
                  if (boardData.board[i][j] !== Players.None) return; // cell must be empty/None
                  if (boardData.winner !== Players.None) return; // game must be on-going

                  // create a copy of the board to modify
                  // This is necessary since the diagram tracks all board states
                  const copy = deepCopy(boardData);

                  copy.changeSource = 'board';
                  copy.currentPlayer =
                    boardData.currentPlayer === Players.Player1 ? Players.Player2 : Players.Player1;

                  copy.board[i][j] = boardData.currentPlayer; // update with this move
                  const [winner, winIdx] = getWinner(copy.board);
                  copy.winner = winner; // set who won if anyone, or draw
                  copy.winnerIndex = winIdx; // set how they won if applicable
                  copy.move = [i, j]; // set where the most recent move took place

                  setBoardData(copy); // propagate changes
                }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* strike through */}
      {(boardData.winner === Players.Player1 || boardData.winner === Players.Player2) && (
        <div
          className="absolute w-full rounded-[999px]"
          style={{
            height: strikeWidth,
            backgroundColor:
              boardData.winner === Players.Player1 ? 'var(--board-p1)' : 'var(--board-p2)',
            top: getTop(boardData.winnerIndex),
            left: getLeft(boardData.winnerIndex),
            translate: '-50% -50%',
            rotate: getRotate(boardData.winnerIndex)
          }}
        />
      )}
    </div>
  );
}
