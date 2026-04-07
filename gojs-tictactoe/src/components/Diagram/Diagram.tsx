import go from 'gojs';
import './Diagram.css';

import { useEffect, useRef, type Dispatch, type RefObject } from 'react';
import type { BoardData, CellValue } from '../../types';
import { Players } from '../../types';
import { symbolMap } from '../../constants';
import { listEquals } from '../../utils';
import { useTheme, type Theme } from '../../ThemeContext';

let diagram: go.Diagram;
let lastBoard: RefObject<BoardData | null> | null = null;

const linkWidth = 18;
const outlineWidth = 3;
const nodeRadius = 5; // roundedness

const shadowSize = 20; // blur size

// get the gojs theme color for the current winner
function getWinnerTheme(winner: Players) {
  if (winner == Players.None) return 'outline';
  else if (winner == Players.Player1) return 'player1';
  else if (winner == Players.Player2) return 'player2';
  else if (winner == Players.Both) return 'draw';
  return 'outline';
}

function initDiagram(setBoardData: Dispatch<BoardData>, theme: Theme) {
  diagram = new go.Diagram({
    'undoManager.isEnabled': true, // must be set to allow for model change listening
    'undoManager.maxHistoryLength': 0, // disable undo/redo functionality
    'animationManager.isEnabled': false,
    maxScale: 5,
    contentAlignment: go.Spot.Center, // keep nodes centered when possible
    autoScale: go.AutoScale.Uniform,

    // don't allow deleting or creating nodes
    allowSelect: false,
    allowDelete: false,
    allowClipboard: false,

    // format the model data as a tree so we can define a parent easily
    model: new go.TreeModel({
      nodeKeyProperty: 'key',
      makeUniqueKeyFunction: (m: go.Model, data: any) => {
        // generate unique keys, this is used for the react state variable too
        let k = data.key || 1;
        while (m.findNodeDataForKey(k)) k++;
        data.key = k;
        return k;
      }
    }),
    layout: new go.TreeLayout({
      nodeSpacing: 32 // extra space between nodes in the diagram
    })
  });

  diagram.addModelChangedListener(modelChangeListener);

  // initialize shadow scale
  diagram.model.modelData.shadowBlur = shadowSize * diagram.scale;

  (window as any).myDiagram = diagram; // For debugging purposes only

  // setup light/dark
  diagram.themeManager.set('light', {
    colors: {
      outline: null, // default outline color
      link: 'var(--color-zinc-300)',
      text: 'var(--color-board-text)',
      adornment: 'var(--color-ui-tertiary)',

      primary: 'var(--color-board-primary)',
      secondary: 'var(--color-board-secondary)',

      // player/winner colors
      player1: 'var(--color-board-p1)',
      player2: 'var(--color-board-p2)',
      draw: 'var(--color-amber-700)'
    }
  });

  // The css variables here will be the dark theme versions because when GoJS
  // tests the value of the css variables the root element will have the "dark" class
  diagram.themeManager.set('dark', {
    colors: {
      outline: null,
      link: 'var(--color-zinc-600)',
      text: 'var(--color-board-text)',
      draw: 'var(--color-amber-500)'
    }
  });

  // initialize theme
  diagram.themeManager.currentTheme = theme;

  // link template
  diagram.linkTemplate = new go.Link({
    corner: linkWidth,
    layerName: 'Background'
  }).add(new go.Shape({ strokeWidth: linkWidth }).theme('stroke', 'link'));

  // TicTacToe board row item
  const boardRow = new go.Panel('TableRow').add(
    new go.Panel('Table', {
      itemTemplate: new go.Panel('TableColumn').add(
        new go.Shape({
          strokeWidth: 0,
          width: 15,
          height: 15,
          fill: null
        }),
        new go.TextBlock({
          spacingAbove: 1.5 // adjust text placement
        })
          .bind('text', '', (cell: Players) => {
            return symbolMap[cell]; // X or O
          })
          .themeData('stroke', '', 'colors', (cellValue: CellValue, obj: any) => {
            // set the color of this X or O to blue/red if it was the most recent move in this state
            const node = obj.part;
            if (!node || !(node instanceof go.Node)) return 'black';
            const data = node.data as BoardData;
            if (!data) throw new Error(`data not found for node: ${node.key}`);

            // go up the .panel chain searching for row/col of this cell
            let row = -1;
            let col = -1;
            while (obj.panel) {
              if (obj.panel.type === go.Panel.Table) {
                if (obj.row || row === -1) row = obj.row;
                if (obj.column || col === -1) col = obj.column;
              }
              obj = obj.panel;
            }

            // return the name of the appropriate theme color. If row/col === the row/col of the
            // last move then highlight this TextBlock
            return listEquals(data.move, [row, col])
              ? cellValue === Players.Player1
                ? 'player1'
                : 'player2'
              : 'text';
          })
      )
    })
      .theme('defaultColumnSeparatorStroke', 'secondary')
      .bind('itemArray', '')
  );

  // node template
  diagram.nodeTemplate = new go.Node('Auto', {
    shadowOffset: new go.Point(0, 0),
    locationSpot: go.Spot.Center,
    cursor: 'pointer',
    mouseEnter: (_, obj) => {
      const node = obj.part as go.Node;
      const shape = node.findObject('background') as go.Shape;
      if (!shape) return;

      const br = new go.Brush(shape.fill as string);

      if (node.diagram?.themeManager.currentTheme === 'dark') br.darkenBy(0.2);
      else br.lightenBy(0.15);

      diagram.model.set(shape, 'fill', br);
    },
    mouseLeave: (_, obj) => {
      const node = obj.part as go.Node;
      if (!node) return;
      node.updateTargetBindings('primary');
    }
  })
    // this shadow is used to add a glow effect to winning states
    .bind('isShadowed', 'winner', (winner: Players) => winner !== Players.None)
    .themeData('shadowColor', 'winner', 'colors', (winner: Players) => {
      if (winner == Players.Player1) return 'player1';
      else if (winner == Players.Player2) return 'player2';
      return 'draw';
    })
    .bindModel('shadowBlur')
    .add(
      // background shape for the node, and outline
      new go.Shape('RoundedRectangle', {
        name: 'background',
        strokeWidth: 0,
        parameter1: nodeRadius,
        shadowVisible: true
      })
        .bind('strokeWidth', 'winner', (winner: Players) =>
          winner === Players.None ? 0 : outlineWidth
        )
        .themeData('stroke', 'winner', 'colors', getWinnerTheme)
        .theme('fill', 'primary'),

      // spot panel is used to overlay a strike through over the table line when a player wins
      new go.Panel('Spot').add(
        new go.Panel('Table', {
          itemTemplate: boardRow
        })
          .theme('defaultRowSeparatorStroke', 'secondary')
          .bind('itemArray', 'board'),

        new go.Shape('RoundedRectangle', {
          parameter1: Infinity, // max roundness / pill shape
          strokeWidth: 0,
          width: outlineWidth,
          stretch: go.Stretch.Fill
        })
          .themeData('fill', 'winner', 'colors', getWinnerTheme)
          // place and rotate the shape correctly for the winning move
          .bind('alignment', 'winnerIndex', (idx: number) => {
            if (idx < 3) return new go.Spot(0.5, (idx * 2 + 1) / 6);
            if (idx < 6) return new go.Spot(((idx - 3) * 2 + 1) / 6, 0.5);
            return go.Spot.Center;
          })
          .bind('angle', 'winnerIndex', (idx: number) => {
            if (idx < 3) return 90;
            if (idx < 6) return 0;
            if (idx === 6) return -45;
            return 45;
          })
      )
    );

  // change selected history/timeline state on click
  diagram.addDiagramListener('ObjectSingleClicked', e => {
    const node = e.subject?.part;
    if (!node || !(node instanceof go.Node)) return;

    // ignore no-op
    if (!lastBoard) return;
    if (lastBoard.current?.key === node.data.key && lastBoard.current?.key != null) return;

    lastBoard.current = node.data;
    if (!lastBoard.current) throw new Error('selected node missing node.data');

    // propagate change to react components
    lastBoard.current.changeSource = 'diagram'; // mark where the change comes from
    setBoardData(lastBoard.current);
    updateSelectedBoard();
  });

  return diagram;
}

function modelChangeListener(e: go.ChangedEvent) {
  // only run when new nodes are added
  if (e.propertyName !== 'nodeDataArray') return;
  if (!lastBoard) return;

  updateSelectedBoard();

  if (!lastBoard.current) {
    // if no board was previously selected
    return;
  }
  const prevNode = diagram.findNodeForKey(lastBoard.current?.key);
  if (!prevNode) throw new Error(`Couldn't find previous node for data: ${lastBoard.current}`);

  // add the extra link arrow to the end of the current branch when applicable
  // this indicates when the branch can be continued
  diagram.commit(d => {
    if (!lastBoard?.current) return;

    // remove old arrow
    const parentKey = prevNode.data.parent;
    const parent = diagram.findNodeForKey(parentKey);
    if (parent) {
      const links = parent.findLinksOutOf();
      links.next();
      const l = links.value;
      const name = l?.toNode?.name;
      if (name === 'temp') {
        d.remove(l.toNode!);
      }
    }

    // if the game ended or there already is an arrow then don't add one
    if (lastBoard.current.winner !== Players.None || prevNode.findLinksOutOf().count !== 0) {
      return;
    }

    // add new arrow
    const p = new go.Node('Auto', {
      // invisible Node for link.toNode
      isAnimated: false,
      selectable: false,
      pickable: false,
      width: 60,
      height: 60,
      name: 'temp' // to find this for removal
    });

    p.data = {};
    d.add(p);

    const l = new go.Link({
      pickable: false,
      corner: 10
    }).add(
      new go.Shape({ strokeWidth: linkWidth }).theme('stroke', 'link'),
      new go.Shape({
        toArrow: 'NormalArrow',
        scale: linkWidth / 5,
        segmentOffset: new go.Point(linkWidth, 0)
      })
        .theme('fill', 'link')
        .theme('stroke', 'link')
    );

    l.fromNode = prevNode;
    l.toNode = p;

    d.add(l);
  });
}

let _adornment: go.Adornment | null = null; // show current state in the timeline
function updateSelectedBoard() {
  if (!diagram) return;

  if (!_adornment) {
    // initialize the adornment
    _adornment = new go.Adornment('Spot').add(
      new go.Panel('Auto').add(
        new go.Shape('RoundedRectangle', {
          strokeWidth: outlineWidth,
          fill: null,
          spot1: new go.Spot(0, 0, outlineWidth / 2, outlineWidth / 2),
          spot2: new go.Spot(1, 1, -outlineWidth / 2, -outlineWidth / 2),
          parameter1: nodeRadius + outlineWidth / 2
        })
          // don't add outline to winner states
          .bind('strokeWidth', 'winner', winner => (winner === Players.None ? outlineWidth : 0))
          .theme('stroke', 'adornment'),
        new go.Placeholder()
      ),

      // to remove the outline use only a PlaceHolder without the auto panel
      // new go.Placeholder(),

      new go.Shape({
        name: 'arrow',
        alignmentFocus: go.Spot.Bottom,
        alignment: go.Spot.Top,
        geometryString:
          'F M 144.043 155.311 L 218.536 197.277 C 221.595 198.901 225.351 198.373 227.843 195.968 C 230.336 193.563 230.997 189.827 229.482 186.713 L 151.192 16.103 C 149.848 13.373 147.073 11.643 144.03 11.636 C 140.988 11.631 138.206 13.35 136.851 16.074 L 58.561 186.685 C 57.046 189.799 57.707 193.535 60.2 195.94 C 62.691 198.345 66.448 198.873 69.507 197.249 L 144.043 155.311 Z',
        strokeWidth: 0,
        angle: 180,
        scale: 0.125
      }).theme('fill', 'adornment')
    );
  }

  diagram.commit(() => {
    if (!_adornment) return;
    if (!lastBoard?.current) return;

    const nextNode = diagram.findNodeForKey(lastBoard.current?.key);
    if (!nextNode) throw new Error(`Couldn't find node for key: ${lastBoard.current?.key}`);

    // adorn the current state node
    _adornment.adornedObject = nextNode;
  }, null);
}

export default function Diagram({
  boardData,
  setBoardData
}: {
  boardData: BoardData;
  setBoardData: Dispatch<BoardData>;
}) {
  const { theme } = useTheme();

  // initialize the diagram
  const diagramDiv = useRef<HTMLDivElement>(null);
  lastBoard = useRef<BoardData | null>(null);

  const diaRef = useRef<go.Diagram>(null);
  useEffect(() => {
    if (!lastBoard) throw new Error(`Last board undefined. Expected RefObject`);

    lastBoard.current = null;

    if (!diaRef.current) diaRef.current = initDiagram(setBoardData, theme);

    diagram = diaRef.current;
    diaRef.current.div = diagramDiv.current;
  }, []);

  // update diagram theme
  useEffect(() => {
    if (!diagram) return;
    diagram.themeManager.currentTheme = theme;
    diagram.updateAllThemeBindings();
  }, [theme]);

  // update state history/timeline
  useEffect(() => {
    if (!diagram) return;
    if (!diagram.model.makeUniqueKeyFunction) return;
    if (boardData.changeSource === 'diagram') return; // don't update the diagram for changes from the diagram

    if (!lastBoard) throw new Error(`Last board undefined. Expected RefObject`);

    // before making a new node check to see if one already exists with this same state
    const lastNode = diagram.findNodeForKey(lastBoard.current?.key);
    if (lastNode) {
      let links = lastNode.findLinksOutOf();
      while (links.hasNext()) {
        const link = links.value;
        const data: BoardData = link?.toNode?.data;
        if (!data) throw new Error('link.toNode is missing data');

        if (listEquals(data.move, boardData.move)) {
          // a timeline state exists for this move already, move to it
          lastBoard.current = data;
          updateSelectedBoard();
          return;
        }
      }
    }

    // set the unique key and parent
    boardData.key = diagram.model.makeUniqueKeyFunction(diagram.model, boardData);
    if (lastBoard.current) boardData.parent = lastBoard.current.key;
    lastBoard.current = boardData;

    // add this state to the history/timeline
    diagram.model.commit(m => {
      m.addNodeData(boardData);
    });
  }, [boardData]);

  return <div className="diagram-component" ref={diagramDiv}></div>;
}
