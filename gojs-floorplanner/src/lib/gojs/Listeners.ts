import go from 'gojs';
import { showRoomAreas, hideDividers, hideMeasurements } from '$lib/stores/stores';
import { WallBuilderTool } from '$lib/gojs/WallBuilderTool';
import * as FPUtils from '$lib/gojs/FloorPlanUtils';
import { get } from 'svelte/store';

// Adds diagram and model change listeners to the diagram, takes handleSelectionData function for setting runes
export function InitializeListeners(diagram: go.Diagram, handleSelectionChangedData: go.DiagramEventHandler) {

  // Pass data to node info page
  diagram.addDiagramListener('ChangedSelection', handleSelectionChangedData);

  // Handles wall point, room, wallpart, and link deletion
  diagram.addDiagramListener('SelectionDeleting', e => {
    e.subject.each((part: go.Part) => {
      // Deselects wall points that have not selected links connected so they aren't deleted
      if (part.category === 'wallPoint' && part instanceof go.Node) {
        const connectedLinksIt = part.findLinksConnected().iterator;
        let found = false;
        while (!found && connectedLinksIt.next()) {
          if (!e.subject.has(connectedLinksIt.value)) found = true;
        }
        if (found) part.isSelected = false;
        if (!found) {
          FPUtils.deleteRoomsForRemovedPoint(part);
        }
      } else if (part.category === 'wallPart' && part instanceof go.Node) {
        const link = diagram.findLinkForKey(part.data.linkKey);
        if (link && link.data.wallparts) {
          let array = link.data.wallparts.slice(); // copy for undo manager
          const index = link.data.wallparts.indexOf(part.key);
          // Remove the wall part's key from the link data
          if (index > -1) {
            array.splice(index, 1);
            diagram.model.commit(m => m.set(link.data, 'wallparts', array));
          }
        }
      } else if (part instanceof go.Node && part.category === 'room') {
        // Remove room key from member wall points
        part.data.pointKeys.forEach((key: number) => {
          const node = diagram.findNodeForKey(key);
          if (!node || node.category !== 'wallPoint') return;
          let array = node.data.rooms.slice(); // make copy for undo manager
          const index = array.indexOf(part.data.key);
          if (index > -1) {
            array.splice(index, 1);
            diagram.model.set(node.data, 'rooms', array);
          }
        })
      }
    })
  });

  diagram.addDiagramListener('SelectionDeleted', e => {
    e.subject.each((part: any) => {
      if (part instanceof go.Link && (part.category === 'wallLink' || part.category === 'divider')) {
        // Remove any wall parts
        if (part.data.wallparts) {
          part.data.wallparts.forEach((key: number) => {
            const node = diagram.findNodeForKey(key);
            if (node) diagram.remove(node);
          })
        }
        // Join connected straight walls
        const fromNode = part.fromNode;
        const toNode = part.toNode;
        if (fromNode && toNode) {
          FPUtils.joinStraightWallsForPoint(fromNode);
          FPUtils.joinStraightWallsForPoint(toNode);
          FPUtils.miterPoint(fromNode);
          FPUtils.miterPoint(toNode);
          // Check if rooms are valid
          const smallerRoomSet = fromNode.data.rooms.length < toNode.data.rooms.length ? new Set(fromNode.data.rooms) : new Set(toNode.data.rooms);
          const largerRoomArray = fromNode.data.rooms.length >= toNode.data.rooms.length ? fromNode.data.rooms : toNode.data.rooms;
          const intersectRoomArray = largerRoomArray.filter((n: number) => smallerRoomSet.has(n));
          intersectRoomArray.forEach((roomKey: number) => {
            const room = diagram.findNodeForKey(roomKey);
            if (room) FPUtils.checkRoomValid(room);
          })
        }
      }
    })
  });

  // Removes wall parts with no parent link, joins dropped wall points when holding control
  diagram.addDiagramListener('SelectionMoved', e => {
    e.subject.each((part: any) => {
      if (part.category === 'wallPart') {
        FPUtils.findWallPartParent(part);
        if (part.data.linkKey) {
          FPUtils.moveWallPart(part);
        } else {
          diagram.remove(part);
        }
      } else if (part.category === 'wallPoint' && e.diagram.lastInput.control) {
        // If a wall point is moved while control is held, check if there is one wall or divider connected to it
        const linkIt = part.findLinksConnected();
        linkIt.next();
        const link = linkIt.value;
        if (linkIt.count === 1 && link && (link.category === 'wallLink' || link.category === 'divider')) {
          // Find other end point and then search for nearby wall points
          const isFrom = link.fromNode === part ? true : false;
          const otherNode = isFrom ? link.toNode : link.fromNode;
          const closestNode = WallBuilderTool.findClosestWallPoint(part.location, e.diagram, part);
          // If a close point is found, re route wall/divider to that point and remove dragged point
          if (closestNode && isFrom) {
            link.fromNode = closestNode;
            e.diagram.remove(part);
            FPUtils.miterPoint(closestNode);
          } else if (closestNode && !isFrom) {
            link.toNode = closestNode;
            e.diagram.remove(part);
            FPUtils.miterPoint(closestNode);
          } else {
            // If no close point, search for nearby walls/dividers
            const ptAndLink = WallBuilderTool.findPointAndLink(
              part.location, 
              otherNode.location, 
              e.diagram, 
              link.category === 'divider' ? 'divider' : 'wall', 
              link
            );
            // If a wall or divider is found, this will join in the dragged wall point
            WallBuilderTool.joinFromWall(ptAndLink, part, e.diagram);
            FPUtils.miterPoint(part);
          }
        }
      }
    })
  });

  // Readjusts segment fraction when wall parts are resized so the fraction is accurate in the model data
  // Uses re-parenting function to calculate this
  diagram.addDiagramListener('PartResized',
    e => {
      let part = e.subject;
      while (part && part !== part.part) part = part.part;
      if (part instanceof go.Node && part.category === 'wallPart') FPUtils.findWallPartParent(part);
    }
  );

  // Handle copying parts
  function handleCopy(coll: go.Set<go.Part>) {
    const prevSkips = diagram.skipsUndoManager;
    diagram.skipsUndoManager = true;

    // Map original copied-from keys to the new copied parts
    const walls: Map<go.Key, go.Link> = new Map();
    const wallparts: Map<go.Key, go.Node> = new Map();
    const wallpoints: Map<go.Key, go.Node> = new Map();
    const rooms: Map<go.Key, go.Node> = new Map();

    coll.each((part: any) => {
      if (part instanceof go.Link && part.category === 'wallLink') {
        walls.set(part.data.copiedFrom, part);
      } else if (part instanceof go.Node && part.category === 'wallPart') {
        wallparts.set(part.data.copiedFrom, part);
      } else if (part instanceof go.Node && part.category === 'wallPoint') {
        wallpoints.set(part.data.copiedFrom, part);
      } else if (part instanceof go.Node && part.category === 'room') {
        rooms.set(part.data.copiedFrom, part);
      } else if (part.data.copiedFrom) {
        // Remove copiedFrom reference from data for all other copied parts
        delete part.data.copiedFrom;
      }
    })

    rooms.forEach((value: go.Node, key: go.Key, map: Map<go.Key, go.Node>) => {
      const newPointKeys: Array<go.Key> = [];
      // Go through old point keys reference and and add the corresponding copy keys in order
      value.data.pointKeys.forEach((key: go.Key) => {
        const node = wallpoints.get(key);
        if (!node) return;
        newPointKeys.push(node.key);
      })
      diagram.model.set(value.data, 'pointKeys', newPointKeys);
      delete value.data.copiedFrom;
    })

    wallpoints.forEach((value: go.Node, key: go.Key, map: Map<go.Key, go.Node>) => {
      const newRooms: Array<go.Key> = [];
      // Go through old rooms reference and replace with the corresponding copied room references if they exist
      value.data.rooms.forEach((key: go.Key) => {
        const node = rooms.get(key);
        if (!node) return;
        newRooms.push(node.key);
      })
      diagram.model.set(value.data, 'rooms', newRooms);
      delete value.data.copiedFrom;
    })

    walls.forEach((value: go.Link, key: go.Key, map: Map<go.Key, go.Link>) => {
      const ogWall = diagram.findLinkForKey(value.data.copiedFrom);
      if (!ogWall) return;
      const newWallparts: Array<go.Key> = [];
      // Replace old wall part reference list with copied versions
      ogWall.data.wallparts.forEach((key: go.Key) => {
        const newPart = wallparts.get(key);
        if (!newPart) return;
        newWallparts.push(newPart.key);
      })
      diagram.model.set(value.data, 'wallparts', newWallparts);
      delete value.data.copiedFrom;
    })

    wallparts.forEach((value: go.Node, key: go.Key, map: Map<go.Key, go.Node>) => {
      const ogWallPart = diagram.findNodeForKey(value.data.copiedFrom);
      if (!ogWallPart) return;
      const ogLink = walls.get(ogWallPart.data.linkKey);
      if (!ogLink) return;
      // Keep old size and segment fraction, replace link key with new copy and move the wall part
      const frac = ogWallPart.data.segFrac;
      const size = ogWallPart.data.size;
      const newLink = walls.get(ogLink.data.linkKey);
      diagram.model.set(value.data, 'segFrac', frac);
      diagram.model.set(value.data, 'size', size);
      if (newLink) {
        diagram.model.set(value.data, 'linkKey', newLink.key);
        FPUtils.moveWallPart(value);
      }
      delete value.data.copiedFrom;
    })

    diagram.skipsUndoManager = prevSkips;
  }

  // Handle drag copying from drag tool
  diagram.addDiagramListener('SelectionCopied', (e) => handleCopy(e.subject));

  // Handle copying from Ctrl/Cmd+C
  diagram.addDiagramListener('ClipboardPasted', (e) => handleCopy(e.subject));

  // Handles various model changes and data bookkeeping
  diagram.addModelChangedListener(e => {
    if (diagram.skipsUndoManager) return; // Prevents infinite loops
    // Undo handing to fix measurement link bindings not updating on undo
    if (e.object && e.propertyName === 'FinishedUndo') {
      e.object.changes.each((change: go.ChangedEvent) => {
        // Listen for wall point location changes, if they have measurement links connected, update bindings on link
        if (!(change.propertyName === 'loc' && change.object && change.object.category === 'wallPoint')) return;
        const node = diagram.findNodeForKey(change.object.key);
        if (!node) return;
        const linkIt = node.findLinksConnected();
        while (linkIt.next()) {
          if (linkIt.value.category === 'measurement') linkIt.value.updateTargetBindings();
          linkIt.next();
        }
      })
    }
    if (diagram.undoManager.isUndoingRedoing) return; // Don't do the following while undo/redoing
    if (e.object && e.propertyName === 'loc' && e.object.category === 'wallPoint') {
      // Miter moved wall points as they are being dragged
      const node = diagram.findNodeForKey(e.object.key);
      if (!node) return;
      FPUtils.miterPoint(node);
      const connectedLinks = node.findLinksConnected();
      connectedLinks.each(link => {
        // Move wall parts and miter points on connected links
        if (link.category === 'wallLink') {
          const parts = link.data.wallparts;
          parts.forEach((key: number) => {
            const node = diagram.findNodeForKey(key);
            if (node) FPUtils.moveWallPart(node);
          });
          if (link.toNode && link.fromNode && link.toNode === node) FPUtils.miterPoint(link.fromNode);
          else if (link.toNode && link.fromNode && link.fromNode === node) FPUtils.miterPoint(link.toNode);
        }
      })
      // Recalculate room nodes that have been altered
      node.data.rooms.forEach((roomKey: number) => {
        const room = diagram.findNodeForKey(roomKey);
        if (!(room instanceof go.Node) || room.category !== 'room') return;
        FPUtils.updateRoomGeometry(room);
      })
    }
    if (e.propertyName === 'nodeDataArray') {
      if (e.newValue && e.newValue.category === 'room') {
        // Check if room areas should be shown when adding new rooms
        const roomNode = diagram.findNodeForKey(e.newValue.key);
        if (roomNode && roomNode.category === 'room') {
          const prev = diagram.skipsUndoManager;
          diagram.skipsUndoManager = true;
          const areaText = roomNode.findObject('AREATEXT');
          if (areaText) areaText.visible = get(showRoomAreas);
          diagram.skipsUndoManager = prev;
        }
      }
    }
    if (e.propertyName === 'linkDataArray') {
      // Check if dividers and measurements should be shown when adding them
      if (e.newValue && e.newValue.category === 'divider') {
        const link = diagram.findLinkForKey(e.newValue.key);
        if (link && link.category === 'divider') {
          const prev = diagram.skipsUndoManager;
          diagram.skipsUndoManager = true;
          link.visible = !get(hideDividers);
          diagram.skipsUndoManager = prev;
        }
      } else if (e.newValue && e.newValue.category === 'measurement') {
        const link = diagram.findLinkForKey(e.newValue.key);
        if (link && link.category === 'measurement') {
          const prev = diagram.skipsUndoManager;
          diagram.skipsUndoManager = true;
          link.visible = !get(hideMeasurements);
          diagram.skipsUndoManager = prev;
        }
      }
    }
  })
}