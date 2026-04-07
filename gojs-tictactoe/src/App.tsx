import { useState, useRef } from 'react';
import './App.css';
import { symbolMap } from './constants';

import TicTacToe from './components/TicTacToe/TicTacToe';
import Diagram from './components/Diagram/Diagram';
import type { BoardData } from './types';
import { Players } from './types';
import { useTheme } from './ThemeContext';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const [boardData, setBoardData] = useState<BoardData>({
    board: [
      [Players.None, Players.None, Players.None],
      [Players.None, Players.None, Players.None],
      [Players.None, Players.None, Players.None]
    ],
    currentPlayer: Players.Player1,
    changeSource: 'board',
    winner: Players.None,
    winnerIndex: NaN,
    move: null
  });

  const grid = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-1 flex h-full w-full flex-col">
      {/* buttons */}
      <div className="ml-auto flex flex-row p-0.5">
        <button
          className="h-fit w-fit cursor-pointer rounded-md p-1 hover:bg-zinc-300/75 dark:hover:bg-zinc-700/75"
          onClick={() => {
            toggleTheme();
          }}
        >
          {theme === 'light' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="var(--ui-text)"
              viewBox="0 0 256 256"
            >
              <path d="M120,40V32a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-8-8A8,8,0,0,0,50.34,61.66Zm0,116.68-8,8a8,8,0,0,0,11.32,11.32l8-8a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l8-8a8,8,0,0,0-11.32-11.32l-8,8A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l8,8a8,8,0,0,0,11.32-11.32ZM40,120H32a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16Zm88,88a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-8A8,8,0,0,0,128,208Zm96-88h-8a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16Z"></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="var(--ui-text)"
              viewBox="0 0 256 256"
            >
              <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path>
            </svg>
          )}
        </button>
        <a
          className="h-fit w-fit cursor-pointer rounded-md p-1 hover:bg-zinc-300/75 dark:hover:bg-zinc-700/75"
          href="https://github.com/NorthwoodsSoftware/GoJS"
          target="_blank"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            role="img"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="var(--ui-text)"
              d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            ></path>
          </svg>
        </a>
      </div>
      <div ref={grid} className="grid-container mb-4">
        {/* left column*/}
        <div className="flex grow-0 flex-col">
          {/* board modal */}
          <div className="modal bg-board-primary flex grow flex-col place-content-around py-0">
            <div className="text-board-text my-2 flex grow items-center justify-center text-lg">
              {boardData.winner === Players.None && (
                <p>{symbolMap[boardData.currentPlayer]}'s turn</p>
              )}
              {boardData.winner !== Players.None && (
                <p>
                  {boardData.winner === Players.Both
                    ? `It's a draw!`
                    : `${symbolMap[boardData.winner]} wins!`}
                </p>
              )}
            </div>

            <div className="w-fit flex-none grow-0 self-center">
              <TicTacToe boardData={boardData} setBoardData={setBoardData} />
            </div>

            <div className="my-2 grow" />
          </div>
        </div>

        {/* right column*/}
        <div className="modal flex grow flex-col justify-start gap-2 text-left">
          <h1>Interactive React Diagram</h1>
          <ul>
            <li>
              Play regular Tic-Tac-Toe in the React component (on your first visit this will be
              highlighted).
            </li>
            <li>See the timeline get generated in the GoJS diagram.</li>
            <li>Click on a state in the timeline to return to it.</li>
            <li>Now making new changes will create a branch in the timeline!</li>
          </ul>

          <p className="mt-auto">
            This is a sample made using the{' '}
            <a target="_blank" href="https://gojs.net">
              GoJS
            </a>{' '}
            diagramming library -{' '}
            <a target="_blank" href="https://gojs.net/latest/samples/">
              see all GoJS samples
            </a>
          </p>
        </div>

        {/* diagram modal */}
        <div className="modal flex grow flex-col pt-0">
          <p className="my-2 grow-0">Game State Timeline Branches</p>
          <Diagram boardData={boardData} setBoardData={setBoardData} />
        </div>
      </div>

      <div className="modal mb-4 flex grow flex-col justify-start gap-2 text-left">
        <h2>How it Works</h2>

        <p>
          This Tic-Tac-Toe sample demonstrates the{' '}
          <a href="https://gojs.net/latest/index.html" target="_blank">
            GoJS
          </a>{' '}
          diagramming library used in a simple React app with state being changed by both the
          Diagram and the page.
        </p>

        <p>
          The board and timeline are both controlled by a React{' '}
          <a href="https://react.dev/learn/state-a-components-memory" target="_blank">
            state variable
          </a>
          . Inside of <code>Diagram.tsx</code> there is an effect hook on this state variable. When
          it is updated that board state is appended to the Diagrams nodeDataArray. When a board in
          the Diagram is selected the same{' '}
          <a href="https://react.dev/learn/state-a-components-memory" target="_blank">
            state variable
          </a>{' '}
          is updated to the new board. Along with this board a "source" property is set so that the
          Diagram's effect hook knows to ignore its own changes.
        </p>

        <p>
          We are happy to help you begin a proof-of-concept for your own project, regardless of your
          needs.{' '}
          <a href="https://nwoods.com/support.html" target="_blank">
            Contact us
          </a>{' '}
          for more information.
        </p>
        <p>
          <a target="_blank" href="https://github.com/NorthwoodsSoftware/gojs-projects">
            The GoJS-TicTacToe project source code can be found here
          </a>
        </p>
        <p>
          <a href="https://gojs.net" target="_blank">
            gojs.net
          </a>{' '}
          -{' '}
          <a href="https://gojs.net/latest/samples/" target="_blank">
            see all GoJS samples
          </a>
        </p>
      </div>
    </div>
  );
}
