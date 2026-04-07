# gojs-TicTacToe

### By Northwoods Software for [GoJS](https://gojs.net)

This Tic-Tac-Toe sample demonstrates the
<a href="https://gojs.net/latest/index.html" target="_blank">
GoJS </a>
diagramming library used in a simple React app with state being changed by both the
Diagram and the page.

## Installation

Start by running `npm i` to install all necessary dependencies.

`npm run dev` runs the app in the development mode.

## GoJS Diagrams in React Components

The board and timeline are both controlled by a React
<a href="https://react.dev/learn/state-a-components-memory" target="_blank">
state variable
</a>
. Inside of `Diagram.tsx` there is an effect hook on this state variable. When
it is updated that board state is appended to the Diagrams nodeDataArray. When a board in
the Diagram is selected the same
<a href="https://react.dev/learn/state-a-components-memory" target="_blank">
state variable
</a>
is updated to the new board. Along with this board a "source" property is set so that the
Diagram's effect hook knows to ignore its own changes.

We are happy to help you begin a proof-of-concept for your own project, regardless of your
needs.
<a href="https://nwoods.com/support.html" target="_blank">
Contact us
</a>
for more information.

## [Project source code](https://github.com/NorthwoodsSoftware/gojs-projects)

## [See more GoJS Samples](https://gojs.net/latest/samples/)
