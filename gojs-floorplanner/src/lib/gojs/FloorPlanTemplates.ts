import go from 'gojs';
import * as FPUtils from '$lib/gojs/FloorPlanUtils';
import { useFeet } from '$lib/stores/stores';
import { get } from 'svelte/store';
import { DefaultNode } from './FurnitureTemplates';

// Contains node and link templates as well as some related functions
// Also has constants used vor visual aspects of the diagram

export const isMac = (navigator !== undefined && navigator.userAgent !== undefined && navigator.userAgent.match(/(iPhone|iPod|iPad|Mac)/i) !== null) ? true : false;
export const font = '13px "JetBrains Mono Variable", monospace';
export const wallStrkW = 1;
export const wallColor = '#6e6e6e';
export const wallPartSearchRadSq = 5000;
export const GRIDSNAPSIZE = new go.Size(10, 10);
export const doorOutlineGeos = ['F M 0 0 H 10 Q 10 10 0 10 V 0', 'F M 0 0 H 10 V 10 Q 0 10 0 0'];
// Colors for room backgrounds
export const roomColors = ['burlywood', 'whitesmoke', 'antiquewhite', 'indianred', 'lightblue'];
// Blank model for first load of saved model
export const blankModel = 
`{ "class": "GraphLinksModel",
  "linkKeyProperty": "key",
  "linkFromPortIdProperty": "fromPort",
  "linkToPortIdProperty": "toPort",
  "nodeDataArray": [],
  "linkDataArray": []
}`
// Background grids for feet and meters
export const meterGrid =
  new go.Panel(go.Panel.Grid, { name: 'GRID', gridCellSize: GRIDSNAPSIZE })
    .add(
      new go.Shape('LineH', { stroke: 'lightgray', strokeWidth: 0.5, interval: 1 })
        .theme('stroke', 'gridMinor'),
      new go.Shape('LineV', { stroke: 'lightgray', strokeWidth: 0.5, interval: 1 })
        .theme('stroke', 'gridMinor'),
      new go.Shape('LineH', { stroke: 'gray', strokeWidth: 0.5, interval: 5 })
        .theme('stroke', 'gridMajor'),
      new go.Shape('LineV', { stroke: 'gray', strokeWidth: 0.5, interval: 5 })
        .theme('stroke', 'gridMajor'),
      new go.Shape('LineH', { stroke: 'gray', strokeWidth: 1, interval: 10 })
        .theme('stroke', 'gridMajor'),
      new go.Shape('LineV', { stroke: 'gray', strokeWidth: 1, interval: 10 })
        .theme('stroke', 'gridMajor')
    );
export const feetGrid =
  new go.Panel(go.Panel.Grid, { 
    name: 'GRID', 
    gridCellSize: new go.Size((1.52399995123 / 2) * GRIDSNAPSIZE.width, (1.52399995123 / 2) * GRIDSNAPSIZE.height) 
  })
    .add(
      new go.Shape('LineH', { stroke: 'lightgray', strokeWidth: 0.5, interval: 1 })
        .theme('stroke', 'gridMinor'),
      new go.Shape('LineV', { stroke: 'lightgray', strokeWidth: 0.5, interval: 1 })
        .theme('stroke', 'gridMinor'),
      new go.Shape('LineH', { stroke: 'gray', strokeWidth: 0.5, interval: 10 })
        .theme('stroke', 'gridMajor'),
      new go.Shape('LineV', { stroke: 'gray', strokeWidth: 0.5, interval: 10 })
        .theme('stroke', 'gridMajor'),
      new go.Shape('LineH', { stroke: 'gray', strokeWidth: 1, interval: 20 })
        .theme('stroke', 'gridMajor'),
      new go.Shape('LineV', { stroke: 'gray', strokeWidth: 1, interval: 20 })
        .theme('stroke', 'gridMajor')
    );

// Resize handles for resize adornments
export function makeResizeHandle(size: number) {
  return new go.Shape('Circle', {
    cursor: 'pointer',
    fill: 'skyblue',
    stroke: 'dodgerblue',
    desiredSize: new go.Size(size, size)
  });
}

// Returns a simple context menu button with a given function and text
export function createContextMenuButton(text: string, func: Function, visiblePredicate?: Function) {
  let button = (go.GraphObject.build('ContextMenuButton', {
    // Passes the node instead of the adornment
    click: (e, button) => func(e, (button.part && button.part instanceof go.Adornment) ? button.part.adornedObject : button),
    'ButtonBorder.fill': 'white',
    "_buttonFillOver": '#1E90FF20',
  }) as go.Panel)
    .add(new go.TextBlock(text, { font, margin: new go.Margin(4, 0, 2, 0) }))
  if (visiblePredicate) {
    button.bindObject('visible', '', (o, e) => (o.diagram ? visiblePredicate(o, e) : false));
  }
  return button;
}

 // Context menus for applicable diagram items
export const wallContextMenu = (go.GraphObject.build('ContextMenu') as go.Adornment).add(
  createContextMenuButton('Add Window', (e: go.DiagramEvent, link: go.Link) => FPUtils.addWallPart(e, link, 'window')),
  createContextMenuButton('Add Door', (e: go.DiagramEvent, link: go.Link) => FPUtils.addWallPart(e, link, 'door')),
  createContextMenuButton('Increase Width', (e: go.InputEvent, link: go.Link) => FPUtils.modifyWallSize(e, link, 4)),
  createContextMenuButton('Decrease Width', (e: go.InputEvent, link: go.Link) => FPUtils.modifyWallSize(e, link, -4)),
  createContextMenuButton('Split Wall', FPUtils.splitWall)
);

// Checks if the join walls context menu should appear on wall points
export function wallPointContextMenuPred(menu: go.Adornment, e: go.DiagramEvent) : boolean {
  const node = menu.adornedObject;
  if (!(node instanceof go.Node)) return false;
  const links = node.findLinksConnected();
  if (links.count !== 2) return false;
  links.next();
  const first = links.value;
  links.next();
  const second = links.value;
  if (first.category !== 'wallLink' || second.category !== 'wallLink') return false;
  const angle1 = FPUtils.getLinkAngle(first, node);
  const angle2 = FPUtils.getLinkAngle(second, node);
  const isPi = (Math.abs(angle2 - angle1) < Math.PI + 0.05 && Math.abs(angle2 - angle1) > Math.PI - 0.05);
  return isPi;
}

export const wallPointContextMenu = (go.GraphObject.build('ContextMenu') as go.Adornment).add(
  createContextMenuButton('Join Walls', (e: go.InputEvent, node: go.Node) => FPUtils.joinStraightWallsForPoint(node), wallPointContextMenuPred)
);

// Allows shift drag to ignore grid and control (mac) or alt (windows) drag to un-snap walls from points and rejoin them
export function wallPointDrag(thisPart: go.Part, pt: go.Point, gridpt: go.Point) {
  if (!thisPart.diagram) return gridpt;
  const diagram = thisPart.diagram;
  const removeKeyDown = isMac ? diagram.lastInput.control : diagram.lastInput.alt;
  if (diagram.selection.count === 3 && removeKeyDown) {
    // Check if the selection is a single wall (two nodes connected by a wall/divider)
    const selection = thisPart.diagram.selection;
    const wall = FPUtils.isSingleWall(selection);
    if (wall) {
      const linkIt = (thisPart as go.Node).findLinksConnected();
      if (linkIt.count < 2) return thisPart.diagram!.lastInput.shift ? pt : gridpt; // Return if not connected
      // Copy node data and create new point to replace the dragged one
      const newData = diagram.model.copyNodeData(thisPart.data);
      delete newData.copiedFrom;
      diagram.commit(() => {
        diagram.model.addNodeData(newData);
        const newNode = diagram.findNodeForData(newData);
        if (!newNode) return thisPart.diagram!.lastInput.shift ? pt : gridpt;
        // Redirect connected links (not the selected one) to this new point, add to array to avoid modifying the collection
        const linksToUpdate: go.Link[] = [];
        while (linkIt.next()) {
          const link = linkIt.value;
          if ((link.fromNode === thisPart || link.toNode === thisPart) && link !== wall) {
            linksToUpdate.push(link);
          }
        }
        linksToUpdate.forEach(link => {
          if (link.fromNode === thisPart) {
            link.fromNode = newNode;
          } else if (link.toNode === thisPart) {
            link.toNode = newNode;
          }
        });
        FPUtils.miterPoint(newNode); // Miter new junction
        FPUtils.joinStraightWallsForPoint(newNode); // Join if there are two straight walls left
        FPUtils.updateRoomsForRemovedPoint((thisPart as go.Node), newNode); // Update affected rooms
        // Remove room data from dragged node that was just removed
        if (thisPart.diagram) thisPart.diagram.model.set(thisPart.data, 'rooms', []);
      })
    }
  }
  // Allows precision dragging by holding shift
  if (thisPart.diagram!.lastInput.shift) return pt;
  return gridpt;
}

// Template for wall points that allow for wall links to be formed and moved
export const wallPointNodeTemplate = new go.Node('Spot', {
  locationObjectName: 'MAIN',
  locationSpot: go.Spot.Center,
  zOrder: 2,
  dragComputation: wallPointDrag,
  selectionObjectName: 'HOVERSHAPE',
  isShadowed: false,
  selectionAdornmentTemplate:
    new go.Adornment('Auto')
      .add(
        new go.Shape('RoundedRectangle', {
          fill: null,
          stroke: 'skyblue',
          strokeWidth: 2
        }),
        new go.Placeholder({ padding: 3 })
      ),
  contextMenu: wallPointContextMenu
})
  .bindTwoWay('location', 'loc', go.Point.parse, go.Point.stringify)
  .add(
    // Main port and anchor of the node
    new go.Shape('Circle', {
      name: 'MAIN',
      fill: null,
      stroke: null,
      desiredSize: new go.Size(0, 0),
      fromLinkable: true,
      toLinkable: true,
      portId: '',
      fromSpot: new go.Spot(0.5, 0.5),
      toSpot: new go.Spot(0.5, 0.5)
    }),
    // Outline of the wall junction, doesn't draw over walls
    new go.Shape({
      name: 'MITEROUTLINE',
      fill: null,
      stroke: 'black',
      strokeWidth: 2 * wallStrkW,
      visible: false,
    }),
    // Fills in the junction to cover stroke and ends of links
    new go.Shape({
      name: 'MITERSHAPE',
      fill: wallColor,
      stroke: null,
      strokeWidth: 0,
      visible: false
    }),
    // Draws in where the walls intersect to form a junction point
    new go.Shape({
      name: 'MITERSTROKE',
      fill: null,
      stroke: 'black',
      strokeWidth: wallStrkW,
      visible: false
    }),
    // Hover icon/handle
    new go.Shape('Circle', {
      name: 'HOVERSHAPE',
      fill: 'transparent',
      strokeWidth: 1,
      stroke: null,
      desiredSize: new go.Size(10, 10),
      mouseEnter: (e, obj) => { 
        e.diagram.commit(() => {
          if (!(obj instanceof go.Shape)) return;
          obj.stroke = 'dodgerblue';
          obj.fill = 'skyblue';
          obj.strokeWidth = 2;
        }, null)  
      },
      mouseLeave: (e, obj) => {
        e.diagram.commit(() => {
          if (!(obj instanceof go.Shape)) return;
          obj.stroke = null;
          obj.fill = 'transparent'
          obj.strokeWidth = 1;
        }, null)
      }
    }).bind('desiredSize', 'size', sz => new go.Size(sz, sz))
  );

// Called from door context menu, these two functions change the direction of the door sweep
export function flipDoor(e: go.DiagramEvent, part: go.Node) {
  e.diagram.model.commit(m => {
    m.set(part.data, 'flipped', !part.data.flipped);
    m.set(part.data, 'alignOffset', -(part.data.alignOffset));
  });
}

export function swapHinge(e: go.DiagramEvent, part: go.Node) {
  e.diagram.model.commit(m => m.set(part.data, 'swapped', !part.data.swapped));
}

export const doorContextMenu = (go.GraphObject.build('ContextMenu') as go.Adornment).add(
  createContextMenuButton('Flip', flipDoor),
  createContextMenuButton('Swap Hinge', swapHinge)
);

// Keeps wallpart on link path, similar to LinkLabelOnPathDraggingTool
export function wallPartDrag(wallPart: go.Part, pt: go.Point, gridpt: go.Point) {
  const diagram = wallPart.diagram;
  if (!diagram) return pt;
  const link = diagram.findLinkForKey(wallPart.data.linkKey);
  if (!link || !link.path || !link.path.geometry) {
    FPUtils.findWallPartParent(wallPart as go.Node);
    return pt;
  }
  const last = diagram.lastInput.documentPoint;
  const localpt = link.path.getLocalPoint(last);
  const buffer = FPUtils.getPathBuffer(wallPart, link, GRIDSNAPSIZE);
  let frac = link.path.geometry.getFractionForPoint(localpt);
  if (!diagram.lastInput.shift) { // Snap to grid scale if shift isn't held
    frac = Math.round(frac * buffer[2]) / buffer[2];
  }
  frac = Math.min(Math.max(frac, buffer[0]), buffer[1]);
  // Update segment fraction in node data
  diagram.model.commit(m => m.set(wallPart.data, 'segFrac', frac));
  const docpt = FPUtils.getDocPointOfLinkFrac(link, frac);
  if (docpt) {
    const dist = docpt.distanceSquaredPoint(pt);
    if (dist >= wallPartSearchRadSq) {
      FPUtils.findWallPartParent(wallPart as go.Node);
      return pt
    };
    return docpt;
  } else {
    return pt;
  }
}

// Template for window and door nodes, area associated with wall links in data
export const wallPartTemplate = new go.Node('Spot', {
  locationSpot: go.Spot.Center,
  locationObjectName: 'SHAPE',
  dragComputation: wallPartDrag,
  layerName: 'Foreground',
  zOrder: 0,
  contextClick: (e: go.InputEvent, obj: go.GraphObject) => {
    FPUtils.moveWallPart((obj as go.Node));
  },
  mouseEnter: (e: go.InputEvent, thisObj: go.GraphObject) => {
    e.diagram.commit(() => {
      const shape = (thisObj as go.Node).findObject('SHAPE');
      if (!shape || !(shape instanceof go.Shape)) return;
      shape.stroke = 'skyblue';
      const doorOutline = (thisObj as go.Node).findObject('DOOROUTLINE');
      if (!doorOutline || !(doorOutline instanceof go.Shape) || doorOutline.visible === false) return;
      doorOutline.stroke = 'skyblue';
    }, null)
  },
  mouseLeave: (e: go.InputEvent, thisObj: go.GraphObject) => {
    e.diagram.commit(() => {
      const shape = (thisObj as go.Node).findObject('SHAPE');
      if (!shape || !(shape instanceof go.Shape)) return;
      shape.stroke = 'black';
      const doorOutline = (thisObj as go.Node).findObject('DOOROUTLINE');
      if (!doorOutline || !(doorOutline instanceof go.Shape) || doorOutline.visible === false) return;
      doorOutline.stroke = null;
    }, null)
  },
  selectionObjectName: 'SHAPE',
  selectionAdornmentTemplate:
    new go.Adornment('Auto')
      .add(
        new go.Shape('Rectangle', {
          fill: null,
          stroke: 'skyblue',
          strokeWidth: 2
        }),
        new go.Placeholder()
      ),
  resizable: true,
  resizeObjectName: 'SHAPE',
  resizeAdornmentTemplate:
    new go.Adornment('Spot')
      .add(
        new go.Placeholder(),
        new go.Shape('Circle', {
          name: 'LEFTHANDLE',
          cursor: 'col-resize',
          alignment: go.Spot.Left,
          alignmentFocus: go.Spot.Center,
          fill: 'skyblue',
          stroke: 'dodgerblue'
        })
          .bind('desiredSize', 'size', s => {
            const size = go.Size.parse(s).height / 1.5;
            return new go.Size(size, size);
          }),
        new go.Shape('Circle', {
          name: 'RIGHTHANDLE',
          cursor: 'col-resize',
          alignment: go.Spot.Right,
          alignmentFocus: go.Spot.Center,
          fill: 'skyblue',
          stroke: 'dodgerblue'
        })
          .bind('desiredSize', 'size', s => {
            const size = go.Size.parse(s).height / 1.5;
            return new go.Size(size, size);
          })
      )
})
  .bind('contextMenu', 'type', t => t === 'door' ? doorContextMenu : null)
  .add(
    new go.Shape({ 
      name: 'DOOROUTLINE',
      fill: '#D3D3D370',
      stroke: null,
      geometryString: doorOutlineGeos[0], 
      desiredSize: new go.Size(60, 60),
      alignment: new go.Spot(0.5, 0.5, 0, 30),
      angle: 0,
      visible: false
    })
      .bind('visible', 'type', t => t === 'window' ? false : true)
      .bind('geometryString', 'swapped', v => v ? doorOutlineGeos[1] : doorOutlineGeos[0])
      .bind('angle', 'flipped', v => v ? 180 : 0)
      .bind('alignment', 'alignOffset', v => new go.Spot(0.5, 0.5, 0, v))
      .bind('desiredSize', 'size', size => {
        const width = go.Size.parse(size).width;
        return new go.Size(width, width);
      }),
    new go.Shape({ 
      name: 'SHAPE', 
      fill: 'white',
      stroke: 'black',
      strokeWidth: wallStrkW,
      desiredSize: new go.Size(60, 10)
    })
      .bind('desiredSize', 'size', 
        s => {
          const size = go.Size.parse(s);
          return new go.Size(size.width, size.height + wallStrkW);
        }, 
        s => {
          return go.Size.stringify(new go.Size(s.width, s.height - wallStrkW))
        }
      ),
    new go.Shape({
      name: 'WINDOWMARKER',
      isPanelMain: true,
      stroke: 'lightgray',
      strokeWidth: 2,
      geometryString: 'M 0 0 V 2 M 0 1 H 10 M 10 0 V 2'
    })
      .bind('desiredSize', 'size', s => {
        const size = go.Size.parse(s);
        return new go.Size(Math.max(size.width - 10, 5), size.height)
      })
      .bind('stroke', 'type', t => t === 'window' ? 'lightgray' : null),
    new go.Shape('Rectangle', {
      name: 'DOORMARKER',
      stroke: null,
      fill: 'lightgray'
    })
      .bind('desiredSize', 'size', s => {
        const size = go.Size.parse(s);
        return new go.Size(Math.max(size.width - wallStrkW, 5), 2)
      })
      .bind('fill', 'type', t => t === 'door' ? 'lightgray' : null)
  );

// Returns an item array for room color selection
export function colorPickerArray() : Array<Object> {
  let array: Array<Object> = [];
  for (let color of roomColors) {
    array.push({ color, selected: false });
  }
  return array;
}

// Visually replaces label node and has color selector options to change room color
export const colorAdornment = new go.Adornment('Auto', { 
  locationSpot: go.Spot.Center, 
  zOrder: 10,
  pickable: true,
  isActionable: true,
  doubleClick: (e: go.InputEvent, thisObj: go.GraphObject) => {
    // Allows the text on the adornment to be edited
    let room = (thisObj as go.Adornment).adornedObject;
    if (!(room && room instanceof go.Node)) return;
    const text = (thisObj as go.Panel).findObject('ROOMNAME');
    if (!(text && text instanceof go.TextBlock)) return;
    e.diagram.commandHandler.editTextBlock(text);
  }
})
  .add(
    new go.Panel('Auto', {
      alignment: go.Spot.Center
    })
      .add(
        new go.Shape('RoundedRectangle', {
          name:'TEXTSHAPE',
          fill: '#fbfcf9',
          strokeWidth: 0.5,
          stroke: 'black'
        }),
        new go.Panel('Vertical')
          .add(
            new go.TextBlock('Room', {
              name: 'ROOMNAME',
              alignment: go.Spot.Center,
              editable: true,
              margin: new go.Margin(4, 2),
              textAlign: 'center',
              font
            })
              .bindTwoWay('text', 'text', t => (!t || /^\s*$/.test(t)) ? 'Room' : t),
            new go.TextBlock({
              name: 'AREATEXT',
              alignment: go.Spot.Center,
              editable: false,
              margin: new go.Margin(2, 2),
              textAlign: 'center',
              font
            })
              .bind('text', 'area', FPUtils.convertLength),
            new go.Panel('Horizontal', {
              name: 'COLORPICKER',
              visible: true,
              itemTemplate: 
                new go.Panel({
                  click: colorBlockSelect,
                  mouseEnter: (e: go.InputEvent, thisObj: go.GraphObject) => {
                    // Ignore hightlight if already selected
                    if ((thisObj as go.Panel).data.selected) return;
                    e.diagram.commit(() => {
                      const shape = (thisObj as go.Node).findObject('COLORBLOCK');
                      if (!shape || !(shape instanceof go.Shape)) return;
                      shape.stroke = 'skyblue';
                    }, null)
                  },
                  mouseLeave: (e: go.InputEvent, thisObj: go.GraphObject) => {
                    if ((thisObj as go.Panel).data.selected) return;
                    e.diagram.commit(() => {
                      const shape = (thisObj as go.Node).findObject('COLORBLOCK');
                      if (!shape || !(shape instanceof go.Shape)) return;
                      shape.stroke = null;
                    }, null)
                  },
                  isActionable: true
                })
                  .add(
                    new go.Shape('RoundedRectangle', {
                      name: 'COLORBLOCK',
                      desiredSize: new go.Size(20, 20),
                      stroke: null,
                      strokeWidth: 2
                    })
                    .bind('fill', 'color')
                    .bind('stroke', 'selected', v => v ? 'skyblue' : null)
                  ),
              itemArray: colorPickerArray()
            })
          )
      )
);

// Handles selecting rooms
export function roomSelectionChanged(part: go.Part) {
  if (!(part.diagram && part.diagram.lastInput)) return;
  const diagram = part.diagram;
  const colorPicker = colorAdornment.findObject('COLORPICKER');
  if (!colorPicker) return;
  const prevSkips = diagram.skipsUndoManager; // Skip undo manager
  diagram.skipsUndoManager = true;
  const colorPanels = (colorPicker as go.Panel).elements.iterator;
  const label = part.findObject('LABELPANEL');
  const selectedRooms: Array<go.Node> = [];
  diagram.selection.each(part => {
    if (part instanceof go.Node && part.category === 'room') {
      selectedRooms.push(part);
    }
  })
  if (part.isSelected && selectedRooms.length === 1) {
    // If just selected, add the color selection adornment where the label is on the node
    colorAdornment.adornedObject = part;
    const offset = go.Spot.parse(part.data.alignment);
    const loc = part.getDocumentPoint(go.Spot.Center);
    colorAdornment.location = new go.Point(loc.x + offset.offsetX, loc.y + offset.offsetY);
    part.addAdornment('colorpicker', colorAdornment);
    if (label) label.visible = false;
    while (colorPanels.next()) {
      // Select the color panel that represents the accurate color, deselect others
      const panel = (colorPanels.value as go.Panel);
      const block = panel.findObject('COLORBLOCK');
      if (block && block instanceof go.Shape && block.fill === part.data.fill) {
        panel.data.selected = true;
      } else if (block && block instanceof go.Shape && block.fill !== part.data.fill) {
        panel.data.selected = false;
      }
      panel.updateTargetBindings(); // Update visuals
    }
    const shape = part.findObject('TEXTSHAPE');
    if (shape && shape instanceof go.Shape) {
      shape.stroke = 'black';
      shape.strokeWidth = 0.5;
    }
  } else if (selectedRooms.length > 1) {
    selectedRooms.forEach(room => {
      const roomLabel = room.findObject('LABELPANEL');
      if (!(roomLabel && roomLabel instanceof go.Panel)) return;
      roomLabel.visible = true;
      // Remove blue stroke from mouse enter
      const shape = roomLabel.findObject('TEXTSHAPE');
      if (shape && shape instanceof go.Shape) {
        shape.stroke = 'black';
        shape.strokeWidth = 0.5;
      }
    })
    colorAdornment.adornedObject = null;
  } else {
    // If deselected, remove adornment
    colorAdornment.adornedObject = null;
    part.removeAdornment('colorpicker');
    if (label) label.visible = true;
  }
  part.diagram.skipsUndoManager = prevSkips;
}

// Handles color block selection
export function colorBlockSelect(e: go.InputEvent, thisObj: go.GraphObject) {
  // Find the node from the adornment
  let adorn = thisObj;
  while (adorn.part && adorn.part !== adorn) adorn = adorn.part;
  if (!(adorn && adorn instanceof go.Adornment && adorn.adornedObject)) return;
  const node = adorn.adornedObject;
  if (!(node instanceof go.Node && node.diagram && thisObj instanceof go.Panel)) return;
  // Select the clicked color panel
  e.diagram.model.set(thisObj.data, 'selected', true);
  thisObj.updateTargetBindings();
  const colorBlock = thisObj.findObject('COLORBLOCK');
  if (!(colorBlock && colorBlock instanceof go.Shape)) return;
  const color = colorBlock.fill;
  // Change room color
  node.diagram.model.set(node.data, 'fill', color);
  // Deselect other panels
  const colorPicker = colorAdornment.findObject('COLORPICKER');
  const colorPanels = (colorPicker as go.Panel).elements.iterator;
  while (colorPanels.next()) {
    const panel = (colorPanels.value as go.Panel);
    const block = panel.findObject('COLORBLOCK');
    if (block && block instanceof go.Shape && block.fill !== color) {
      e.diagram.model.set(panel.data, 'selected', false);
      panel.updateTargetBindings();
    }
  }
}

// Background room shape nodes
export const roomNodeTemplate = new go.Node('Spot', {
  layerName: 'Background',
  movable: false,
  // contextMenu: roomContextMenu,
  selectionAdornmentTemplate:
    new go.Adornment('Spot', { zOrder: 0 })
      .add(
        new go.Shape({
          fill: null,
          stroke: 'skyblue',
          strokeWidth: 2
        })
          .bind('geometryString', 'geo'),
        new go.Placeholder()
      ),
  selectionChanged: roomSelectionChanged
})
  .bind('location', 'loc', go.Point.parse, go.Point.stringify)
  .add(
    new go.Shape({
      name: 'MAIN',
      stroke: null,
      pickable: false
    })
      .bind('geometry', 'geo', g => go.Geometry.parse(g))
      .bind('fill'),
    new go.Panel('Auto', {
      name: 'LABELPANEL',
      alignment: go.Spot.Center,
      mouseEnter: (e: go.InputEvent, thisObj: go.GraphObject) => {
        while (thisObj.part && thisObj !== thisObj.part) thisObj = thisObj.part;
        e.diagram.commit(() => {
          const shape = (thisObj as go.Node).findObject('TEXTSHAPE');
          if (!(shape && shape instanceof go.Shape)) return;
          shape.stroke = 'skyblue';
          shape.strokeWidth = 1.5;
        }, null)
      },
      mouseLeave: (e: go.InputEvent, thisObj: go.GraphObject) => {
        while (thisObj.part && thisObj !== thisObj.part) thisObj = thisObj.part;
        e.diagram.commit(() => {
          const shape = (thisObj as go.Node).findObject('TEXTSHAPE');
          if (!(shape && shape instanceof go.Shape)) return;
          shape.stroke = 'black'
          shape.strokeWidth = 0.5;
        }, null)
      }
    })
      .attach({ _isNodeLabel: true })
      .bindTwoWay('alignment', 'alignment', go.Spot.parse, go.Spot.stringify)
      .add(
        new go.Shape('RoundedRectangle', {
          name:'TEXTSHAPE',
          fill: '#fbfcf9',
          strokeWidth: 0.5,
          stroke: 'black'
        }),
        new go.Panel('Vertical')
          .add(
            new go.TextBlock('Room', {
              name: 'ROOMNAME',
              alignment: go.Spot.Center,
              editable: true,
              margin: new go.Margin(4, 2),
              textAlign: 'center',
              font,
            })
              .bindTwoWay('text', 'text', t => (!t || /^\s*$/.test(t)) ? 'Room' : t),
            new go.TextBlock({
              name: 'AREATEXT',
              alignment: go.Spot.Center,
              editable: false,
              margin: new go.Margin(2, 2),
              textAlign: 'center',
              font
            })
              .bind('text', 'area', FPUtils.convertLength)
          )
      )
  );

// Template for wall links
export const wallTemplate = new go.Link({
  zOrder: 1,
  contextMenu: wallContextMenu,
  selectionChanged: (link) => {
    if (!link.isSelected) {
      link.shadowColor = 'gray';
      link.isShadowed = false;
      return;
    }
    if (!(link instanceof go.Link) || !link.fromNode || !link.toNode) return;
    link.shadowColor = 'skyblue';
    link.isShadowed = true;
    link.fromNode.isSelected = true;
    link.toNode.isSelected = true;
  },
  selectionAdornmentTemplate:
    new go.Adornment()
      .add(
        new go.Shape({ isPanelMain: true, stroke: 'skyblue', strokeWidth: 2 })
      ),
  selectionAdorned: false,
  shadowColor: 'gray',
  shadowBlur: 15,
  shadowOffset: new go.Point(0, 0),
  isShadowed: false,
  mouseEnter: (e: go.InputEvent, thisObj: go.GraphObject) => {
    if (!(thisObj instanceof go.Link)) return;
    if (thisObj.isSelected) return;
    e.diagram.commit(() => {
      thisObj.isShadowed = true;
    }, null)
  },
  mouseLeave: (e: go.InputEvent, thisObj: go.GraphObject) => {
    if (!(thisObj instanceof go.Link)) return;
    if (thisObj.isSelected) return;
    e.diagram.commit(() => {
      thisObj.isShadowed = false;
    }, null)
  }
})
  .add(
    new go.Shape({ isPanelMain: true, name: 'OUTLINE', stroke: 'black', strokeWidth: 10 + 2 * wallStrkW, strokeCap: 'butt' })
      .bind('strokeWidth', 'width', w => w + 2 * wallStrkW),
    new go.Shape({ isPanelMain: true, name: 'MAIN', stroke: wallColor, strokeWidth: 10, strokeCap: 'butt', shadowVisible: false })
      .bind('strokeWidth', 'width')
  );

    // Returns the info panel used for measuring walls while drawing
    function makeInfoPanel() { 
      return new go.Panel('Spot', {
        name: 'INFOPANEL'
      })
        .add(
          new go.Shape({
            fill: null,
            stroke: null,
            desiredSize: new go.Size(0, 0)
          }),
          new go.Shape('Rectangle', {
            name: 'TOPLINE',
            fill: 'gray',
            stroke: null,
            alignment: new go.Spot(0.5, 0.5, 0, -16)
          }),
          new go.TextBlock({
            name: 'LENGTHTEXTTOP',
            background: '#fbfcf9',
            alignment: new go.Spot(0.5, 0.5, 0, -16),
            font
          }),
          new go.Shape('Rectangle', {
            name: 'BOTLINE',
            fill: 'gray',
            stroke: null,
            alignment: new go.Spot(0.5, 0.5, 0, 16)
          }),
          new go.TextBlock({
            name: 'LENGTHTEXTBOT',
            background: '#fbfcf9',
            alignment: new go.Spot(0.5, 0.5, 0, 16),
            font
          }),
          new go.Shape({
            name: 'ARROWLT',
            fill: null,
            stroke: 'gray',
            strokeWidth: 2,
            geometryString: 'M 2 0 L 0 2 L 2 4',
            desiredSize: new go.Size(8, 8),
          }),
          new go.Shape({
            name: 'ARROWRT',
            fill: null,
            stroke: 'gray',
            strokeWidth: 2,
            geometryString: 'M 2 0 L 0 2 L 2 4',
            desiredSize: new go.Size(8, 8),
            angle: 180
          }),
          new go.Shape({
            name: 'ARROWLB',
            fill: null,
            stroke: 'gray',
            strokeWidth: 2,
            geometryString: 'M 2 0 L 0 2 L 2 4',
            desiredSize: new go.Size(8, 8),
          }),
          new go.Shape({
            name: 'ARROWRB',
            fill: null,
            stroke: 'gray',
            strokeWidth: 2,
            geometryString: 'M 2 0 L 0 2 L 2 4',
            desiredSize: new go.Size(8, 8),
            angle: 180
          })
        )
    }
    
// Measured version used in the wall builder tool as a temp link
export const tempWallTemplate = new go.Link()
  .add(
    new go.Shape({ isPanelMain: true, name: 'OUTLINE', stroke: 'black', strokeWidth: 10 + 2 * wallStrkW, strokeCap: 'butt' })
      .bind('strokeWidth', 'width', w => w + 2 * wallStrkW),
    new go.Shape({ isPanelMain: true, name: 'MAIN', stroke: wallColor, strokeWidth: 10, strokeCap: 'butt' })
      .bind('strokeWidth', 'width'),
    makeInfoPanel()
  );

// Makes room divider links
export const dividerTemplate = new go.Link({
  zOrder: 0,
  isShadowed: false,
  selectionChanged: (link) => {
    if (!link.isSelected) return;
    if (!(link instanceof go.Link) || !link.fromNode || !link.toNode) return;
    link.fromNode.isSelected = true;
    link.toNode.isSelected = true;
  },
  selectionAdornmentTemplate:
    new go.Adornment()
      .add(
        new go.Shape({ isPanelMain: true, stroke: 'skyblue', strokeWidth: 2 })
      ),
})
  .add(
    new go.Shape({ isPanelMain: true, stroke: 'black', strokeWidth: 1 })
  );

// Temporary version used in the wall builder tool
export const tempDividerTemplate = new go.Link()
  .add(
    new go.Shape({ isPanelMain: true, stroke: 'black', strokeWidth: 1 }),
    makeInfoPanel()
  );

// Defines custom arrowheads for measurement links
go.Shape.defineArrowheadGeometry('MeasureTo', 'M 8 0 L 0 4 L 8 8');
go.Shape.defineArrowheadGeometry('MeasureFrom', 'M 0 0 L 8 4 L 0 8');

// Returns a string with the length of the link in the current units
export function measureLink(link: go.Link) : string {
  if (!link.fromNode || !link.toNode) return '';
  let UNIT = get(useFeet) ? 'ft' : 'm';
  let GRIDSCALE = get(useFeet) ? 15.2399995123 : 50;
  const length = Math.sqrt(link.fromNode.location.distanceSquaredPoint(link.toNode.location));
  return String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT;
}

// Creates dimensioning links used to add measurements to the diagram
export const measurementLinkTemplate = new go.Link({
  selectionChanged: (link) => {
    if (!link.isSelected) return;
    if (!(link instanceof go.Link) || !link.fromNode || !link.toNode) return;
    link.fromNode.isSelected = true;
    link.toNode.isSelected = true;
  },
  shadowColor: 'gray',
  shadowBlur: 10,
  shadowOffset: new go.Point(0, 0),
  isShadowed: false,
  mouseEnter: (e: go.InputEvent, thisObj: go.GraphObject) => {
    if (!(thisObj instanceof go.Link)) return;
    if (thisObj.isSelected) return;
    e.diagram.commit(() => {
      thisObj.isShadowed = true;
    }, null)
  },
  mouseLeave: (e: go.InputEvent, thisObj: go.GraphObject) => {
    if (!(thisObj instanceof go.Link)) return;
    if (thisObj.isSelected) return;
    e.diagram.commit(() => {
      thisObj.isShadowed = false;
    }, null)
  },
  selectionAdornmentTemplate:
    new go.Adornment()
      .add(
        new go.Shape({ isPanelMain: true, stroke: 'skyblue', strokeWidth: 2 })
      ),
})
  .add(
    new go.Shape({ isPanelMain: true, stroke: 'gray', strokeWidth: 2 }),
    new go.Shape({ toArrow: 'MeasureFrom', stroke: 'gray', strokeWidth: 2 }),
    new go.Shape({ fromArrow: 'MeasureTo', stroke: 'gray', strokeWidth: 2 }),
    new go.Panel('Auto').add(
      new go.Shape('RoundedRectangle', { 
        fill: '#fbfcf9',
        strokeWidth: 0.5,
        stroke: 'black'
      }),
      new go.TextBlock({
        name: 'MEASUREMENTTEXT',
        margin: new go.Margin(2, 0, 0, 0),
        font
      })
        .bindObject('text', '', measureLink)
    )
  );

// Map for node templates in the diagram
export const nodeTemplateMap = new go.Map<string, go.Node>();
nodeTemplateMap.add('', DefaultNode); // Default Node (furniture)
nodeTemplateMap.add('wallPoint', wallPointNodeTemplate);
nodeTemplateMap.add('room', roomNodeTemplate);
nodeTemplateMap.add('wallPart', wallPartTemplate);

// Link template map
export const linkTemplateMap = new go.Map<string, go.Link>();
linkTemplateMap.add('wallLink', wallTemplate);
linkTemplateMap.add('divider', dividerTemplate);
linkTemplateMap.add('measurement', measurementLinkTemplate);