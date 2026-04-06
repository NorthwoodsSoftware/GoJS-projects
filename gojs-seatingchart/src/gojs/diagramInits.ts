import * as go from 'gojs';

import { isPerson, unassignSeat } from '@/gojs/functions';
import { nodeTemplateMap } from '@/gojs/nodes';
import { themeManager, undoManager } from '@/gojs/sharedManagers';
import { HorizontalTextRotatingTool, SpecialDraggingTool } from '@/gojs/tools';

export function initDiagram(div: HTMLDivElement): go.Diagram {
  const myDiagram = new go.Diagram(div, {
    'animationManager.isEnabled': false,
    allowDragOut: true, // to Guests diagram
    allowClipboard: false,
    allowCopy: false,
    maxSelectionCount: 1,
    draggingTool: new SpecialDraggingTool(),
    rotatingTool: new HorizontalTextRotatingTool(),
    themeManager,
    'toolManager.hoverDelay': 700
  });

  myDiagram.nodeTemplateMap = nodeTemplateMap;

  myDiagram.model = new go.Model({
    copiesKey: true,
    makeUniqueKeyFunction: () => crypto.randomUUID()
  });
  myDiagram.model.undoManager = undoManager;

  // what to do when a drag-drop occurs in the Diagram's background
  myDiagram.mouseDrop = (e) => {
    // when the selection is dropped in the diagram's background,
    // make sure the selected people no longer belong to any table
    e.diagram.selection.each((n) => {
      if (isPerson(n)) unassignSeat(e.diagram, n.data);
    });
  };

  return myDiagram;
}

export function initGuests(div: HTMLDivElement): go.Diagram {
  const myGuests = new go.Diagram(div, {
    'animationManager.isEnabled': false,
    layout: new go.GridLayout({
      sorting: go.GridSorting.Ascending // sort by Node.text value
    }),
    contentAlignment: go.Spot.Top,
    allowDragOut: true, // to main diagram
    allowMove: false,
    maxSelectionCount: 1,
    themeManager,
    'toolManager.hoverDelay': 700
  });

  myGuests.nodeTemplateMap = nodeTemplateMap;

  myGuests.model = new go.Model({
    copiesKey: true,
    makeUniqueKeyFunction: () => crypto.randomUUID()
  });
  myGuests.model.undoManager = undoManager;

  return myGuests;
}
