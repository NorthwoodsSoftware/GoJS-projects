import * as go from 'gojs';
import { rotationAdornment, toolTip } from '@/gojs/adornments';
import { assignPeopleToSeats, highlightSeats } from '@/gojs/functions';
import { useEditorStore } from '@/store';

const PERSONSIZE = new go.Size(40, 40);
const SEATSIZE = PERSONSIZE.copy().inflate(-5, -5);

export const guestNode = new go.Node('Spot', {
  background: 'transparent',
  locationSpot: go.Spot.Center,
  doubleClick: (_e, obj) => {
    const editorStore = useEditorStore();
    editorStore.$patch((state) => {
      state.open = true;
      state.part = obj.part;
    });
  },
  // what to do when a drag-over or a drag-drop occurs on a Node representing a table
  mouseDragEnter: (_e, node, _prev) => {
    if (!node.diagram) return;
    const dragCopy = node.diagram.toolManager.draggingTool.copiedParts; // could be copied from other diagram
    highlightSeats(node, dragCopy ? dragCopy.toKeySet() : node.diagram.selection, true);
  },
  mouseDragLeave: (_e, node, _next) => {
    if (!node.diagram) return;
    const dragCopy = node.diagram.toolManager.draggingTool.copiedParts;
    highlightSeats(node, dragCopy ? dragCopy.toKeySet() : node.diagram.selection, false);
  },
  mouseDrop: (e, node) => {
    if (!node.diagram) return;
    assignPeopleToSeats(node, node.diagram.selection, e.documentPoint);
  },
  toolTip
}) // in front of all Tables
  .bind('text', 'name') // for sorting
  // when selected is in foreground layer
  .bindObject('layerName', 'isSelected', (s) => (s ? 'Foreground' : ''))
  .add(
    new go.Shape('RoundedRectangle', {
      desiredSize: PERSONSIZE,
      strokeWidth: 0
    }).theme('fill', 'primary')
  )
  .add(
    new go.Panel('Viewbox', { desiredSize: SEATSIZE }).add(
      new go.TextBlock({
        font: 'bold 24px sans-serif'
      })
        .bind('text', 'name', (name: string) =>
          name
            .split(' ')
            .map((n) => `${n.substring(0, 1).toUpperCase()}`)
            .join('')
        )
        .theme('stroke', 'bg')
    )
  );

// Determine circle table diameter based on number of seats
function seatsToDiameter(seats: number) {
  return Math.max(seats * 20, 100);
}

// Conversion function to convert a number of seats into an item array
// of seats around a table
function toSeatArr(seats: number, node: go.Node) {
  if (!node.category) return;
  const seatsArr: go.ObjectData[] = [];
  switch (node.category) {
    case 'rect': {
      const perSide = seats / 2;
      const frac = 1 / (perSide + 1);
      // top half
      for (let i = 1; i <= perSide; i++) {
        const s = frac * i;
        seatsArr.push({ align: `${s} 0` });
      }
      // bottom half
      for (let i = perSide; i > 0; i--) {
        const s = frac * i;
        seatsArr.push({ align: `${s} 1` });
      }
      break;
    }
    case 'circle': {
      const r = seatsToDiameter(seats) / 2;
      const degs = 360 / seats;
      for (let i = 0; i < seats; i++) {
        const a = ((degs * i - 90) * Math.PI) / 180;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        seatsArr.push({ align: `0.5 0.5 ${x} ${y}` });
      }
      break;
    }
    case 'head': {
      const frac = 1 / (seats + 1);
      // top half
      for (let i = 1; i <= seats; i++) {
        const s = frac * i;
        seatsArr.push({ align: `${s} 0` });
      }
      break;
    }
  }
  return seatsArr;
}

function tableStyle(node: go.Node) {
  node
    .set({
      layerName: 'Background', // behind all Persons
      locationSpot: go.Spot.Center,
      rotatable: true,
      doubleClick: (_e, obj) => {
        const editorStore = useEditorStore();
        editorStore.$patch((state) => {
          state.open = true;
          state.part = obj.part;
        });
      },
      // what to do when a drag-over or a drag-drop occurs on a Node representing a table
      mouseDragEnter: (_e, node, _prev) => {
        if (!node.diagram) return;
        const dragCopy = node.diagram.toolManager.draggingTool.copiedParts; // could be copied from other diagram
        highlightSeats(node, dragCopy ? dragCopy.toKeySet() : node.diagram.selection, true);
      },
      mouseDragLeave: (_e, node, _prev) => {
        if (!node.diagram) return;
        const dragCopy = node.diagram.toolManager.draggingTool.copiedParts;
        highlightSeats(node, dragCopy ? dragCopy.toKeySet() : node.diagram.selection, false);
      },
      mouseDrop: (e, node) => {
        if (!node.diagram) return;
        assignPeopleToSeats(node, node.diagram.selection, e.documentPoint);
      },
      itemTemplate: new go.Panel('Spot', { alignmentFocus: go.Spot.Center })
        .bind('alignment', 'align', go.Spot.parse)
        .add(
          new go.Shape('Circle', {
            name: 'SEATSHAPE',
            desiredSize: SEATSIZE,
            strokeWidth: 2
          })
            .theme('fill', 'bgMuted')
            .theme('stroke', 'borderAccented')
        )
        .add(
          new go.TextBlock({ font: '14px sans-serif' })
            .bindObject('text', 'itemIndex', (n) => (n + 1).toString())
            .bindObject('angle', 'angle', (n) => -n, undefined, '/')
            .theme('stroke', 'text')
        ),
      rotateAdornmentTemplate: rotationAdornment
    })
    .bindTwoWay('location', 'loc', go.Point.parse, go.Point.stringify)
    .bindTwoWay('angle')
    .bind('itemArray', 'seats', toSeatArr);
  return node;
}

function spotStyle(panel: go.Panel) {
  panel.add(
    new go.TextBlock({ font: 'bold 16px sans-serif' })
      .bind('text', 'name')
      .bind('angle', 'angle', (n) => -n)
      .theme('stroke', 'text')
  );
  return panel;
}

function seatStyle(shape: go.Shape) {
  shape
    .set({
      name: 'TABLESHAPE',
      strokeWidth: 2
    })
    .theme('fill', 'bgMuted')
    .theme('stroke', 'borderAccented');
  return shape;
}

export const tableR8 = new go.Node('Spot').apply(tableStyle).add(
  new go.Panel('Spot')
    .add(
      new go.Shape('RoundedRectangle').apply(seatStyle).bind('desiredSize', 'seats', (s) => {
        const perSide = s / 2;
        return new go.Size(Math.max(perSide * 60, 150), 100);
      })
    )
    .apply(spotStyle)
);

export const tableR3 = new go.Node('Spot').apply(tableStyle).add(
  new go.Panel('Spot')
    .add(
      new go.Shape('RoundedRectangle').apply(seatStyle).bind('desiredSize', 'seats', (s) => {
        return new go.Size(Math.max(s * 60, 150), 100);
      })
    )
    .apply(spotStyle)
);

export const tableC8 = new go.Node('Spot').apply(tableStyle).add(
  new go.Panel('Spot')
    .add(
      new go.Shape('Circle').apply(seatStyle).bind('desiredSize', 'seats', (s) => {
        const d = seatsToDiameter(s);
        return new go.Size(d, d);
      })
    )
    .apply(spotStyle)
);

export const nodeTemplateMap = new go.Map([
  { key: '', value: guestNode },
  { key: 'rect', value: tableR8 },
  { key: 'head', value: tableR3 },
  { key: 'circle', value: tableC8 }
]);
