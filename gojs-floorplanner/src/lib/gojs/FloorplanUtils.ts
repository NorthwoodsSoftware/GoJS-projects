import go from 'gojs';
import { useFeet } from '$lib/stores/stores';
import { get } from 'svelte/store';
import { wallStrkW, wallPartSearchRadSq, GRIDSNAPSIZE, wallContextMenu } from './FloorPlanTemplates';
import { WallBuilderTool } from './WallBuilderTool';

// Contains various utility functions used by the diagram
// Most can find the diagram using part.diagram when given a part as a parameter, a couple need the diagram passed in

// Uses svelte rune to get current unit, converts number length to string for text binding functions
export function convertLength(length: number) {
  let UNIT = get(useFeet) ? 'ft' : 'm';
  let GRIDSCALE = get(useFeet) ? 15.2399995123 : 50;
  return String(Math.round((length / GRIDSCALE ** 2) * 10) / 10) + ' ' + UNIT + '\u00B2';
}

// Returns the document point of a given fraction along a given link
export function getDocPointOfLinkFrac(link: go.Link, frac: number) : go.Point | null {
  if (!link.fromNode || !link.toNode) return null;
  const fromLoc = link.fromNode.location;
  const toLoc = link.toNode.location;
  const dy = toLoc.y - fromLoc.y;
  const dx = toLoc.x - fromLoc.x;
  return new go.Point(fromLoc.x + dx * frac, fromLoc.y + dy * frac);
}

// Gets link angle based on its specified end point
export function getLinkAngle(link: go.Link, focusNode: go.Node) {
  const otherNode = link.fromNode === focusNode ? link.toNode : link.fromNode;
  return Math.atan2(focusNode.location.y - otherNode!.location.y, otherNode!.location.x - focusNode.location.x);
}

// Extends a point by a given length
export function extendPoint(point: go.Point, length: number) {
  const angle = Math.atan2(point.y, point.x);
  const extendedPoint = new go.Point(point.x + length * Math.cos(angle), point.y + length * Math.sin(angle));
  return extendedPoint;
}

// Calculates fraction buffer so link cant be dragged past the end of a wall
// Returns [fromBuffer, toBuffer, dragSnapFraction]
export function getPathBuffer(wallPart: go.Part, link: go.Link, GRIDSNAPSIZE: go.Size) : Array<number> {
  const labelShape = wallPart.findObject('SHAPE');
  if (!labelShape) return [0, 0];
  if (!link.fromNode || !link.toNode) return [0, 0];
  const labelLength = labelShape.desiredSize.width;
  const fNodeLoc = link.fromNode.location;
  const tNodeLoc = link.toNode.location;
  const linkLength = Math.sqrt(go.Point.distanceSquared(fNodeLoc.x, fNodeLoc.y, tNodeLoc.x, tNodeLoc.y));
  const partBuffer = (labelLength / 2) / linkLength;
  const fNodeBuffer = (link.fromNode.data.size / 2) / linkLength;
  const tNodeBuffer = (link.toNode.data.size / 2) / linkLength;
  return [partBuffer + fNodeBuffer, 1 - partBuffer - tNodeBuffer, linkLength / (GRIDSNAPSIZE.width)];
}

// Checks if a set contains exclusively a single wall or divider, returns null if not, returns the link if so
export function isSingleWall(selection: go.Set<go.Part>) : null | go.Link {
  let node1: go.Node | null = null;
  let node2: go.Node | null = null;
  let wall: go.Link | null = null;
  selection.each(part => {
    if (part instanceof go.Node && part.category === 'wallPoint') {
      if (!node1) {
        node1 = part;
      } else if (node2 !== part) {
        node2 = part;
      }
    } else if (part instanceof go.Link && (part.category === 'wallLink' || part.category === 'divider')) {
      wall = part;
    }
  })
  if (wall) wall = (wall as go.Link);
  if (!(wall && node1 && node2)) return null;
  if ((wall.fromNode === node1 || wall.fromNode === node2) && (wall.toNode === node1 || wall.toNode === node2) && wall.fromNode !== wall.toNode) {
    return wall;
  } else {
    return null;
  }
}

// Check if a node is in a straight wall, delete it and join the walls
export function joinStraightWallsForPoint(node: go.Node) : void {
  const links = node.findLinksConnected();
  if (links.count !== 2) return;
  // Get the two links
  links.next();
  const first = links.value;
  links.next();
  const second = links.value;
  if (first.category !== 'wallLink' || second.category !== 'wallLink') return;
  // Check if their angles are about 180 degrees apart
  const angle1 = getLinkAngle(first, node);
  const angle2 = getLinkAngle(second, node);
  const isPi = (Math.abs(angle2 - angle1) < Math.PI + 0.05 && Math.abs(angle2 - angle1) > Math.PI - 0.05);
  if (!isPi) return;
  // Push wall part data from each link into a new array
  let wallparts = [];
  wallparts.push(...first.data.wallparts);
  wallparts.push(...second.data.wallparts);
  const newFromNode = first.fromNode === node ? first.toNode : first.fromNode;
  const newToNode = second.fromNode === node ? second.toNode : second.fromNode;
  const diagram = node.diagram;
  if (!diagram) return;
  diagram.commit(() => {
    // Reset from and to nodes on first link, remove the second one
    first.fromNode = newFromNode;
    first.toNode = newToNode;
    diagram.remove(second);
    // Update rooms and then remove point
    updateRoomsForRemovedPoint(node);
    diagram.remove(node);
    wallparts.forEach((key: number) => { // Adjust wall parts
      const wallPart = diagram.findNodeForKey(key);
      if (wallPart) findWallPartParent(wallPart);
    })
  })
}

// Recalculates room geometry with stored wall point key order from node data
export function calculateRoomGeometry(diagram: go.Diagram, pointKeys: Array<go.Key>) : go.Geometry {
  const wallPoints: Array<go.Node> = [];
  pointKeys.forEach(key => {
    const node = diagram.findNodeForKey(key);
    if (node && node instanceof go.Node) wallPoints.push(node);
  })
  return generateRoomGeometry(wallPoints);
}

// Makes a geometry out of ordered wallpoint nodes
export function generateRoomGeometry(wallPoints: Array<go.Node>) : go.Geometry {
  const geo = new go.Geometry();
  const fig = new go.PathFigure(0, 0, true);
  const firstNode = wallPoints[0];
  const firstPoint = firstNode.location;
  for (let i = 1; i < wallPoints.length; i++) {
    const node = wallPoints[i];
    const point = new go.Point(node.location.x - firstPoint.x, node.location.y - firstPoint.y);
    fig.add(new go.PathSegment(go.SegmentType.Line, point.x, point.y));
  }
  fig.add(new go.PathSegment(go.SegmentType.Line, 0, 0));
  geo.add(fig);
  return geo;
}

// Calculates the area of a room from its vertices (wall points) with polygon area algorithm
export function getRoomArea(wallPoints: Array<go.Node>) : number {
  let area = 0;
  const numPoints = wallPoints.length;
  let j = numPoints - 1;
  const miterPointMap: Map<number, go.Point> = new Map();

  for (let i = 0; i < numPoints; i++) {
    let iPoint;
    let jPoint;
    // Check if correct miter point was already chosen, if not, calculate it and set it in the map
    if (miterPointMap.get(i)) {
      iPoint = miterPointMap.get(i);
    } else {
      // Check miter points and find one that is in in the room's polygon
      wallPoints[i].data.miterPoints.forEach((loc: string) => {
        const pt = go.Point.parse(loc);
        if (isPointInPolygon(wallPoints, pt)) iPoint = pt;
      })
      if (!iPoint) { // Default if valid point not found
        iPoint = wallPoints[i].location;
      } else {
        miterPointMap.set(i, iPoint);
      }
    }
    // Same for j point
    if (miterPointMap.get(j)) {
      jPoint = miterPointMap.get(j);
    } else {
      wallPoints[j].data.miterPoints.forEach((loc: string) => {
        const pt = go.Point.parse(loc);
        if (isPointInPolygon(wallPoints, pt)) jPoint = pt;
      })
      if (!jPoint) {
        jPoint = wallPoints[j].location;
      } else {
        miterPointMap.set(j, jPoint);
      }
    }
    // Check undefinedness again for safety
    if (!iPoint) iPoint = wallPoints[i].location;
    if (!jPoint) jPoint = wallPoints[j].location;

    area += (jPoint.x + iPoint.x) * (-jPoint.y + iPoint.y);
    j = i;
  }
  return Math.abs(area / 2);
}

// Ray casting algorthim that returns whether or not a point is within a polygon
export function isPointInPolygon(vs: Array<go.Node>, point: go.Point): boolean {
  const x: number = point.x;
  const y: number = point.y;
  let inside: boolean = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi: number = vs[i].location.x;
    const yi: number = vs[i].location.y;
    const xj: number = vs[j].location.x;
    const yj: number = vs[j].location.y;

    const intersect: boolean = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Creates a room node by making geometry out of selected wall points
export function createRoom(diagram: go.Diagram, invalAlertSetter?: (bool: boolean) => void) {
  // Gather wall points into an array and a set for reference
  let wallPoints: Array<go.Node> = [];
  const wallPointSet: Set<go.Node> = new Set();
  diagram.selection.each(part => {
    if (part.category === 'wallPoint' && part instanceof go.Node) {
      wallPoints.push(part);
      wallPointSet.add(part);
    }
  })
  // Return if there aren't enough to form a room
  if (wallPoints.length < 3) return;

  let index = 0;
  let foundValidCycle = false;

  // Attempt to find a loop from every possible starting point until one is found
  while (index < wallPoints.length && !foundValidCycle) {
    const points = attemptLoop(wallPoints[index], wallPoints[index], [wallPoints[index]], wallPointSet);
    if (points) {
      foundValidCycle = true;
      wallPoints = points;
    } else {
      index++;
    }
  }

  // Failed to create room so return and show alert
  if (!foundValidCycle) { 
    if (!invalAlertSetter) return;
    // Set alert to visible
    invalAlertSetter(true);
    setTimeout(() => {
      invalAlertSetter(false);
    }, 3000); // Remove alert after 3 seconds
    return;
  }

  // Calculate bounds
  let sumx = 0;
  let sumy = 0;
  // Keep track of overall top left
  let minx = wallPoints[0].location.x;
  let miny = wallPoints[0].location.y;
  wallPoints.forEach(node => {
    sumx += node.location.x;
    sumy += node.location.y;
    if (node.location.x < minx) minx = node.location.x;
    if (node.location.y < miny) miny = node.location.y;
  });
  const centerx = sumx / wallPoints.length;
  const centery = sumy / wallPoints.length;
  
  // Save their keys in order
  const keys: Array<go.Key> = [];
  wallPoints.forEach(node => keys.push(node.key));
  
  // Get the area
  const area = getRoomArea(wallPoints);

  // Add wall point locations to a geometry path figure
  const geo = generateRoomGeometry(wallPoints);
  
  // Use the local (0, 0) in terms of the document coordinates
  const locPoint = new go.Point(minx, miny);
  const nodeData = { 
    category: 'room', 
    fill: 'burlywood',
    geo: go.Geometry.stringify(geo), 
    loc: go.Point.stringify(locPoint), 
    pointKeys: keys,
    area,
    text: 'Room'
  };
  diagram.model.commit(m => {
    m.addNodeData(nodeData);
    const newRoom = diagram.findNodeForData(nodeData);
    if (!newRoom) return;
    wallPoints.forEach(node => {
      let array = node.data.rooms.slice() ?? [];
      array.push(newRoom.key);
      m.set(node.data, 'rooms', array);
    })
  });
}

// Recursively attempts to form a complete loop given a set of eligible nodes
export function attemptLoop(currentNode: go.Node, startNode: go.Node, nodeArray: Array<go.Node>, selectedNodeSet: Set<go.Node>) : Array<go.Node> | null {
  const links = currentNode.findLinksConnected();
  let finalArray: Array<go.Node> | null = null;
  // Loop through all links out of the current node
  links.each(link => {
    // Find the next node
    const node = link.toNode === currentNode ? link.fromNode : link.toNode;
    if (!node) return;
    if (node === startNode && nodeArray.length > 2) {
      // If it has hit the starting node and accumulated at least 3 points set final array
      finalArray = nodeArray;
      return;
    } else if (selectedNodeSet.has(node) && !nodeArray.includes(node)) {
      // If the next node is in the reference set and hasn't been hit already, branch off
      const newArray = nodeArray.slice();
      newArray.push(node);
      const result = attemptLoop(node, startNode, newArray, selectedNodeSet);
      if (result && (result as Array<go.Node>).length > 2) {
        // Check if the recursive call was successful, if so, set final array
        finalArray = result;
        return;
      }
    }
  })
  // If final array was set, the function will return an array of points in order
  // If no loop was found, final array won't be set and it will return null
  return finalArray;
}

// Deletes rooms that contain a given wall point
export function deleteRoomsForRemovedPoint(wallPoint: go.Node) {
  const diagram = wallPoint.diagram;
  if (!diagram) return;
  wallPoint.data.rooms.forEach((roomKey: number) => {
    const room = diagram.findNodeForKey(roomKey);
    if (!(room instanceof go.Node) || room.category !== 'room') return;
    // Remove room key from member nodes' data
    diagram.model.commit(m => {
      room.data.pointKeys.forEach((key: number) => {
        const point = diagram.findNodeForKey(key);
        if (point === wallPoint) return; // Don't modify observed point
        if (!(point instanceof go.Node) || point.category !== 'wallPoint') return;
        let array = point.data.rooms.slice();
        const index = array.indexOf(room.key);
        if (index === -1) return;
        array.splice(index, 1);
        m.set(point.data, 'rooms', array);
      })
      diagram.remove(room);
    })
  })
}

// Updates rooms that contain a given removed wall point, possibly replaces it, deletes room if not a complete loop
export function updateRoomsForRemovedPoint(wallPoint: go.Node, replacePoint?: go.Node) {
  const diagram = wallPoint.diagram;
  if (!diagram) return;
  wallPoint.data.rooms.forEach((roomKey: number) => {
    const room = diagram.findNodeForKey(roomKey);
    if (!(room instanceof go.Node) || room.category !== 'room') return;
    // Remove or replace key from point key array
    let array = room.data.pointKeys.slice();
    const index = array.indexOf(wallPoint.key);
    if (index === -1) return;
    if (replacePoint) {
      array[index] = replacePoint.key;
    } else {
      array.splice(index, 1);
    }
    // Check if the room can still form a complete loop
    const nodes: Array<go.Node> = [];
    array.forEach((key: number) => {
      const node = diagram.findNodeForKey(key);
      if (node) nodes.push(node);
    })
    const loop = attemptLoop(nodes[0], nodes[0], [nodes[0]], new Set(nodes));
    // If the room is less than three nodes or is not a complete loop, remove it
    if (array.length < 3 || !loop || nodes.length !== array.length) {
      diagram.model.commit(m => {
        room.data.pointKeys.forEach((key: number) => {
          const point = diagram.findNodeForKey(key);
          if (point === wallPoint) return; // Don't modify observed point
          if (!(point instanceof go.Node) || point.category !== 'wallPoint') return;
          let array = point.data.rooms.slice();
          const index = array.indexOf(room.key);
          if (index === -1) return;
          array.splice(index, 1);
          m.set(point.data, 'rooms', array);
        })
        diagram.remove(room);
      })
    } else { // Otherwise set the updated data
      diagram.model.commit(m => {
        m.set(room.data, 'pointKeys', array);
        updateRoomGeometry(room);
        updateRoomArea(room);
      })
    }
  })
}

// Adds a wall point to a given room using the recursive loop checker function
export function addWallPointToRoom(room: go.Node, newPoint: go.Node) {
  const diagram = room.diagram;
  if (!diagram) return;
  // Add all current points to a set as well as the new point
  const pointSet: Set<go.Node> = new Set();
  room.data.pointKeys.forEach((key: number) => {
    const node = diagram.findNodeForKey(key);
    if (node && node.category == 'wallPoint') pointSet.add(node);
  })
  pointSet.add(newPoint);
  // Get a start node
  const startNode = diagram.findNodeForKey(room.data.pointKeys[0]);
  if (!startNode) return;
  // Attempt to find a continuous loop
  const nodeArray = attemptLoop(startNode, startNode, [startNode], pointSet);
  if (!nodeArray || nodeArray.length < 3) return;
  // If a loop is found, make a new point key array from that
  const newPointKeyArray: Array<go.Key> = [];
  nodeArray.forEach(node => {
    newPointKeyArray.push(node.key);
  })
  diagram.model.set(room.data, 'pointKeys', newPointKeyArray);
  // Add the room to the new point's room array;
  const roomArray = newPoint.data.rooms.slice();
  if (roomArray.includes(room.key)) return;
  roomArray.push(room.key);
  diagram.model.set(newPoint.data, 'rooms', roomArray);
}

// Checks if a room forms a valid loop, deletes it if not
export function checkRoomValid(room: go.Node) {
  const diagram = room.diagram;
  if (!diagram) return;
  const pointSet: Set<go.Node> = new Set();
  room.data.pointKeys.forEach((key: number) => {
    const node = diagram.findNodeForKey(key);
    if (node && node.category == 'wallPoint') pointSet.add(node);
  })
  const startNode = diagram.findNodeForKey(room.data.pointKeys[0]);
  if (!startNode) return;
  // Attempt to find a continuous loop
  const nodeArray = attemptLoop(startNode, startNode, [startNode], pointSet);
  if (!nodeArray || nodeArray.length < 3) {
    // Remove room key from each of the room's point keys and delete the room
    diagram.model.commit(m => {
      pointSet.forEach(node => {
        let array = node.data.rooms.slice();
        const index = array.indexOf(room.key);
        if (index > -1) {
          array.splice(index, 1);
          m.set(node.data, 'rooms', array);
        }
      })
      diagram.remove(room);
    })
  }
}

// Recalculates and sets the area on all rooms associated with a given wall point
export function updateRoomAreaForWallPoint(wallPoint: go.Node) {
  const diagram = wallPoint.diagram;
  if (!diagram) return;
  wallPoint.data.rooms.forEach((roomKey: number) => {
    const room = diagram.findNodeForKey(roomKey);
    if (!room || room.category !== 'room') return;
    updateRoomArea(room);
  })
}

// Updates and sets room area
export function updateRoomArea(room: go.Node) {
  const diagram = room.diagram;
  if (!diagram) return;
  let wallPoints: Array<go.Node> = [];
  room.data.pointKeys.forEach((pointKey: number) => {
    const point = diagram.findNodeForKey(pointKey);
    if (point) wallPoints.push(point);
  })
  const area = getRoomArea(wallPoints);
  diagram.model.commit(m => {
    m.set(room.data, 'area', area);
  })
}

// Recalculates room geometry, alignment focus, and area, used in model change listener
export function updateRoomGeometry(room: go.Node) {
  const diagram = room.diagram;
  if (!diagram) return;
  diagram.model.commit(m => {
    let minx = diagram.findNodeForKey(room.data.pointKeys[0])?.location.x;
    let miny = diagram.findNodeForKey(room.data.pointKeys[0])?.location.y;
    let wallPoints: Array<go.Node> = [];
    room.data.pointKeys.forEach((key: go.Key) => {
      const node = diagram.findNodeForKey(key);
      if (!node || node.category !== 'wallPoint') return;
      wallPoints.push(node);
      if (node.location.x < minx!) minx = node.location.x;
      if (node.location.y < miny!) miny = node.location.y;
    })
    const area = getRoomArea(wallPoints);
    const geoString = go.Geometry.stringify(calculateRoomGeometry(diagram, room.data.pointKeys))
    m.set(room.data, 'geo', geoString);
    m.set(room.data, 'loc', go.Point.stringify(new go.Point(minx, miny)));
    m.set(room.data, 'area', area);
  })
}

// Shapes a wall node into a mitered junction based on its wall links
export function miterPoint(wallPoint: go.Node) {
  const diagram = wallPoint.diagram;
  if (!diagram) return;
  const skips = 'Mitering'; // tx name or null
  // Sort connected links by angle
  let links: Array<go.Link> = [];
  let hasDivider = false;
  wallPoint.findLinksConnected().each(link => {
    if (link.category === 'wallLink') links.push(link);
    else if (link.category === 'divider') hasDivider = true;
  })
  const numWalls = links.length;
  let straightWalls = false;
  
  // If the point only has one link, set back to straight line and return
  if (numWalls < 2) {
    if (numWalls  === 1) {
      const link = links[0];
      const width = link.data.width / 2 + wallStrkW;
      const angle = -getLinkAngle(link, wallPoint) + Math.PI / 2;
      const defGeo = new go.Geometry();
      // Offsets move the straight line back to the edge of the link properly
      const offX = wallStrkW * Math.sin(angle);
      const offY = -(wallStrkW * Math.cos(angle));
      const defFig = new go.PathFigure(offX, offY, false);
      // Go straight out left and right, add offsets
      const rightPoint = new go.Point(Math.cos(angle) * width + offX, Math.sin(angle) * width + offY);
      const leftPoint = new go.Point(-Math.cos(angle) * width + offX, -Math.sin(angle) * width + offY);
      // In doc coords for miter point data
      const rightDataPoint = new go.Point(rightPoint.x + wallPoint.location.x, rightPoint.y + wallPoint.location.y);
      const leftDataPoint = new go.Point(leftPoint.x + wallPoint.location.x, leftPoint.y + wallPoint.location.y);
      defFig.add(new go.PathSegment(go.SegmentType.Line, rightPoint.x, rightPoint.y));
      defFig.add(new go.PathSegment(go.SegmentType.Line, leftPoint.x, leftPoint.y));
      defGeo.add(defFig);
      const disp = defGeo.normalize();
      diagram.commit(diag => {
        const stroke = (wallPoint.findObject('MITERSTROKE')! as go.Shape);
        stroke.geometry = defGeo;
        stroke.alignmentFocus = new go.Spot(0, 0, disp.x + wallStrkW / 2, disp.y + wallStrkW / 2);
        stroke.visible = true;
        diag.model.set(wallPoint.data, 'miterPoints', [go.Point.stringify(leftDataPoint), go.Point.stringify(rightDataPoint)]);
      }, skips) // ignore undo manager to prevent infinite loop in model change listener
    } else {
      diagram.commit(diag => {
        const stroke = (wallPoint.findObject('MITERSTROKE')! as go.Shape);
        stroke.geometry = null;
        stroke.visible = false;
        diag.model.set(wallPoint.data, 'miterPoints', []);
      }, skips)
    }
    diagram.commit(diag => {
      const shape = (wallPoint.findObject('MITERSHAPE')! as go.Shape);
      const outline = (wallPoint.findObject('MITEROUTLINE')! as go.Shape);
      shape.geometry = null;
      outline.geometry = null;
      shape.visible = false;
      outline.visible = false;
    }, skips)
    return;
  }

  links.sort((a, b) => {
    const angleA = getLinkAngle(a, wallPoint);
    const angleB = getLinkAngle(b, wallPoint);
    return angleA - angleB;
  });

  let miterPoints: Array<go.Point> = [];
  let dataPoints: Array<string> = []; // Maybe round these
  for (let i = 0; i < links.length; i++) {
    // Get consecutive links as well as half thicknesses and angles
    const a = links[i];
    const b = links[(i+1) % links.length];
    const ht1 = a.data.width / 2;
    const ht2 = b.data.width / 2;
    const angleA = getLinkAngle(a, wallPoint);
    const angleB = getLinkAngle(b, wallPoint);
    // Check if they are going in the same or opposite directions
    const isZero = (Math.abs(angleB - angleA) < 0.05 && Math.abs(angleB - angleA) > -0.05);
    const isPi = (Math.abs(angleB - angleA) < Math.PI + 0.05 && Math.abs(angleB - angleA) > Math.PI - 0.05);
    // If not in the same direction, find intersection
    if (!isZero) {
      let u1;
      let u2;
      let x;
      let y;
      // If opposite direction, go straight back the distance of the larger half width
      if (isPi) {
        if (angleB > angleA) {
          x = Math.cos((angleA + angleB) / 2) * ht2;
          y = -(Math.sin((angleA + angleB) / 2) * ht2);
        } else {
          x = -(Math.cos((angleA + angleB) / 2) * ht2);
          y = Math.sin((angleA + angleB) / 2) * ht2;
        }
        if (numWalls === 2) straightWalls = true;
      } else {
        // Otherwise calculate intersection normally with half width scalars 
        // and unit vectors in the directions of the links
        u1 = ht1 / Math.sin(angleB - angleA);
        u2 = ht2 / Math.sin(angleB - angleA);
        x = Math.cos(angleA) * u2 + Math.cos(angleB) * u1;
        y = -(Math.sin(angleA) * u2 + Math.sin(angleB) * u1);
      }
      let point = new go.Point(x, y);
      // Add this point to the array of points to be used in the geometry
      miterPoints.push(point);
      // Add intersection point in doc coords to node's data
      const dataPoint = new go.Point(wallPoint.location.x + point.x, wallPoint.location.y + point.y);
      dataPoints.push(go.Point.stringify(dataPoint));
      // Extend a rectangular fill over the second link
      if (b.fromNode && b.toNode) {
        // Get length to prevent wall draw over from being longer than the wall
        const length = Math.sqrt(b.fromNode.location.distanceSquaredPoint(b.toNode.location));
        const angle = -getLinkAngle(b, wallPoint);
        if (i === links.length - 1) {
          // Adjusts starting location for last point
          if (Math.abs(angleB - angleA) > Math.PI) {
            // Skip this if dealing with an exterior angle
            miterPoints.push(point);
          } else {
            const firstPoint = miterPoints[0];
            point = new go.Point(
              firstPoint.x + Math.cos((angle + (Math.PI / 2)) % (2 * Math.PI)) * ht2 * 2,
              firstPoint.y + Math.sin((angle + (Math.PI / 2)) % (2 * Math.PI)) * ht2 * 2
            );
            miterPoints.push(point);
          }
        }
        // Traces out rectangular path along wall
        for (let j = 0; j <= 2; j++) {
          let width = j % 2 === 0 ? Math.min(Math.min(ht2 * 3, length), 50) : ht2 * 2;
          // Handling for exterior angles 
          if (angleB - angleA > Math.PI && j === 0) {
            // Extends width on first line to put it out to the intersection
            // Get opposite intersection and extend over to point where rectangle should start
            const newX = -x + Math.cos(angleB - 90) * 2 * ht2;
            const newY = -y + Math.sin(angleB - 90) * 2 * ht2;
            const extra = Math.sqrt(point.distanceSquared(newX, newY));
            width += Math.min(extra, length);
          }
          point = new go.Point(
            point.x + Math.cos((angle - j * (Math.PI / 2)) % (2 * Math.PI)) * width,
            point.y + Math.sin((angle - j * (Math.PI / 2)) % (2 * Math.PI)) * width
          )
          miterPoints.push(point);
        }
      }
    }
  }

  // Main geometry that fills the shape in the color of the wall
  const geo = new go.Geometry();
  if (miterPoints.length === 0) { // Two walls overlapping radially, don't miter
    diagram.commit(diag => {
      const stroke = (wallPoint.findObject('MITERSTROKE')! as go.Shape);
      const shape = (wallPoint.findObject('MITERSHAPE')! as go.Shape);
      const outline = (wallPoint.findObject('MITEROUTLINE')! as go.Shape);
      stroke.visible = false;
      shape.visible = false;
      outline.visible = false;
    }, skips) // ignore undo manager to prevent infinite loop in model change listener
    return;
  } 
  const fig = new go.PathFigure(miterPoints[0].x, miterPoints[0].y, true);
  // Geometry that outlines the outer edges
  const outlineGeo = new go.Geometry();
  const outlineFig = new go.PathFigure(miterPoints[0].x, miterPoints[0].y, true);
  // Geometry that draws the inner outline of where the walls meet (miter)
  const strokeGeo = new go.Geometry();
  const strokeFig = new go.PathFigure(0, 0, false);
  const firstStrkPt = extendPoint(miterPoints[0], wallStrkW); // Slightly extends point
  strokeFig.add(new go.PathSegment(go.SegmentType.Line, firstStrkPt.x, firstStrkPt.y));
  strokeFig.add(new go.PathSegment(go.SegmentType.Line, 0, 0));

  // Checks for the next point after a rectangle draw over overlapping at small angles
  function isOverlapping(i: number) : boolean {
    if (i < 4 || (i + 1) % 5 !== 0) return false;
    let firstX = miterPoints[i - 1].x - miterPoints[i - 2].x;
    let secondX = miterPoints[i].x - miterPoints[i - 1].x;
    if (isNaN(firstX) || isNaN(secondX)) return false;
    // Rounding prevents zero being a small negative number
    firstX = Math.round(firstX * 1000) / 1000;
    secondX = Math.round(secondX * 1000) / 1000;
    let firstY = miterPoints[i - 1].y - miterPoints[i - 2].y;
    let secondY = miterPoints[i].y - miterPoints[i - 1].y;
    if (isNaN(firstY) || isNaN(secondY)) return false;
    firstY = Math.round(firstY * 1000) / 1000;
    secondY = Math.round(secondY * 1000) / 1000;
    if (firstY * secondY < 0 && firstX * secondX < 0) {
      return true;
    };
    return false;
  }

  // Adds calculated points to the geometry
  for (let i = 1; i < miterPoints.length; i++) {
    // Adds points to the outline geometry
    // Makes points that jump over walls Move segments so they don't have a stroke for the outline
    // Also adjusts the pattern for the last wall calculation
    if (((i - 2) % 4 === 0 && (i !== miterPoints.length - 3)) || i === miterPoints.length - 2 || isOverlapping(i)) {
      outlineFig.add(new go.PathSegment(go.SegmentType.Move, miterPoints[i].x, miterPoints[i].y));
    } else {
      outlineFig.add(new go.PathSegment(go.SegmentType.Line, miterPoints[i].x, miterPoints[i].y));
    }
    // Adds points to the inner stroke geometry, slightly extends it by half stroke width
    // Only adds the wall intersection points, adds (0, 0) in between every one so it draws properly
    if (i % 4 === 0 && (i !== miterPoints.length - 1)) {
      const extendedPoint = extendPoint(miterPoints[i], wallStrkW);
      strokeFig.add(new go.PathSegment(go.SegmentType.Line, extendedPoint.x, extendedPoint.y));
      strokeFig.add(new go.PathSegment(go.SegmentType.Line, 0, 0));
    }
    // Adds each point to the main geometry
    fig.add(new go.PathSegment(go.SegmentType.Line, miterPoints[i].x, miterPoints[i].y));
  }
  // Loop back to first point
  outlineFig.add(new go.PathSegment(go.SegmentType.Line, miterPoints[0].x, miterPoints[0].y));
  // Adds figures to geometries and normalizes (0, 0) to the top left
  geo.add(fig);
  outlineGeo.add(outlineFig);
  strokeGeo.add(strokeFig);

  const disp = geo.normalize();
  const strokeDisp = strokeGeo.normalize();

  // Applies these geometries to the diagram
  diagram.commit(diag => {
    const shape = (wallPoint.findObject('MITERSHAPE')! as go.Shape);
    shape.geometry = geo;
    // Sets alignment focus to the local (0, 0) point via saved normalization displacement
    shape.alignmentFocus = new go.Spot(0, 0, disp.x, disp.y);
    shape.visible = true;
    const outline = (wallPoint.findObject('MITEROUTLINE')! as go.Shape);
    outline.geometry = outlineGeo;
    // Adds stroke width to alignment focus
    outline.alignmentFocus = new go.Spot(0, 0, disp.x + wallStrkW, disp.y + wallStrkW);
    outline.visible = true;
    const stroke = (wallPoint.findObject('MITERSTROKE')! as go.Shape);
    stroke.geometry = strokeGeo;
    // Adds half stroke width to alignment focus so the stroke is centered
    stroke.alignmentFocus = new go.Spot(0, 0, strokeDisp.x + wallStrkW / 2, strokeDisp.y + wallStrkW / 2);
    stroke.visible = straightWalls && hasDivider ? false : true; // Not visible if divider inserted in straight wall
    diagram.model.set(wallPoint.data, 'miterPoints', dataPoints);
  }, skips) // ignores undo manager
}

// Moves a wall part node to its correct location, angle, and size based on its model data
export function moveWallPart(wallPart: go.Node) {
  const diagram = wallPart.diagram;
  if (!diagram) return;
  if (diagram.undoManager.isUndoingRedoing) return;

  // Find the link that the wall part is on and get its length and angle
  const link = diagram.findLinkForKey(wallPart.data.linkKey);
  if (!link || !link.fromNode || !link.toNode) return;
  const fromLoc = link.fromNode.location;
  const toLoc = link.toNode.location;
  let pathLength = Math.sqrt(fromLoc.distanceSquaredPoint(toLoc));
  pathLength = pathLength - link.fromNode.data.size - link.toNode.data.size;
  const angle = Math.atan2((fromLoc.y - toLoc.y), (toLoc.x - fromLoc.x)) * 180 / Math.PI;
  // Get the document point for the corresponding segment fraction
  const docpt = getDocPointOfLinkFrac(link, wallPart.data.segFrac);
  if (!docpt) return;

  // Resize to fit the link
  const prevSize = go.Size.parse(wallPart.data.size);
  const length = Math.max(Math.min(prevSize.width, pathLength), 15);
  const newSize = new go.Size(length, link.data.width);

  // Set the location, angle, and size (shape offset if a door) on the wall part
  diagram.model.commit(m => {
    wallPart.location = new go.Point(docpt.x, docpt.y);
    wallPart.angle = -angle;
    m.set(wallPart.data, 'size', go.Size.stringify(newSize));
    if (wallPart.data.type === 'door') {
      const offset = wallPart.data.alignOffset >= 0 ? length / 2 : -(length) / 2
      m.set(wallPart.data, 'alignOffset', offset);
    }
  });
}

// Finds the closest wall and makes the given wall part a member of that wall
export function findWallPartParent(wallPart: go.Node) {
  const diagram = wallPart.diagram;
  if (!diagram) return;
  // Finds walls near the wall part
  const point = wallPart.location;
  const walls = diagram.findObjectsNear(point,
    50,
    x => { const p = x.part; return (p instanceof go.Link) ? p : null; },
    link => link.category === 'wallLink',
    true
  );
  // Search nearby walls for closest eligible point on each wall
  let minDist = Infinity;
  let linkKey: number | null = null;
  let newFrac: number | null = null;
  walls.each(wall => {
    if (!wall.path || !wall.path.geometry) return;
    // Use the point that the wall part would go to to evaluate distance
    const localpt = wall.path.getLocalPoint(point);
    let frac = wall.path.geometry.getFractionForPoint(localpt);
    const buffer = getPathBuffer(wallPart, wall, GRIDSNAPSIZE);
    frac = Math.min(Math.max(frac, buffer[0]), buffer[1]);
    const docpt = getDocPointOfLinkFrac(wall, frac);
    if (!docpt) return;
    const dist = docpt.distanceSquaredPoint(point);
    if (dist < minDist && dist < wallPartSearchRadSq) {
      minDist = dist;
      linkKey = wall.data.key as number;
      newFrac = frac;
    }
  })
  if (linkKey) {
    diagram.model.commit(m => {
      // Remove wall part from original link's array and add to new one
      const oldKey = wallPart.data.linkKey;
      const oldLink = diagram.findLinkForKey(oldKey);
      if (oldLink && oldLink.data.wallparts && oldKey !== linkKey) {
        let wallpartArray = oldLink.data.wallparts.slice();
        const index = wallpartArray.indexOf(wallPart.key);
        if (index > -1) wallpartArray.splice(index, 1);
        m.set(oldLink.data, 'wallparts', wallpartArray);
      }
      const newLink = diagram.findLinkForKey(linkKey!);
      if (newLink && oldKey !== linkKey) {
        let array = newLink.data.wallparts.slice();
        if (!array.includes(wallPart.key)) { // Prevent duplicates in data
          array.push(wallPart.key);
          m.set(newLink.data, 'wallparts', array);
        }
      }
      m.set(wallPart.data, 'linkKey', linkKey);
      // Set new segment fraction and move the wall part
      m.set(wallPart.data, 'segFrac', newFrac);
      moveWallPart(wallPart);
    })
  } else {
    diagram.model.commit(m => {
      const oldLink = diagram.findLinkForKey(wallPart.data.linkKey);
      if (oldLink && oldLink.data.wallparts) {
        let wallpartArray = oldLink.data.wallparts.slice();
        const index = wallpartArray.indexOf(wallPart.key);
        if (index > -1) wallpartArray.splice(index, 1);
        m.set(oldLink.data, 'wallparts', wallpartArray);
      }
      m.set(wallPart.data, 'linkKey', null);
      return;
    })
  }
}

// Adds a wallpart to a wall link
export function addWallPart(e: go.DiagramEvent, link: go.Link, type: string) {
  e.diagram.model.commit(m => {
    const size = go.Size.stringify(new go.Size(60, link.data.width));
    let frac = .5;
    // Get where the user clicked the wall via the context menu location
    const adorn = wallContextMenu;
    let nodeData;
    if (adorn && link.path && link.path.geometry && link.fromNode && link.toNode) {
      // Put wallpart there
      const localpt = link.path.getLocalPoint(adorn.location);
      frac = link.path.geometry.getFractionForPoint(localpt);
      const fNodeLoc = link.fromNode.location;
      const tNodeLoc = link.toNode.location;
      const linkLength = Math.sqrt(go.Point.distanceSquared(fNodeLoc.x, fNodeLoc.y, tNodeLoc.x, tNodeLoc.y));
      const partBuffer = (60 / 2) / linkLength;
      const fNodeBuffer = (link.fromNode.data.size / 2) / linkLength;
      const tNodeBuffer = (link.toNode.data.size / 2) / linkLength;
      frac = Math.min(Math.max(frac, partBuffer + fNodeBuffer), 1 - partBuffer - tNodeBuffer);
    }
    if (type === 'window') {
      nodeData = { 
        category: 'wallPart', 
        type: 'window', 
        linkKey: link.key, 
        segFrac: frac, 
        size 
      }
    } else if (type === 'door') {
      nodeData = { 
        category: 'wallPart', 
        type: 'door', 
        linkKey: link.key, 
        segFrac: frac, 
        size, 
        flipped: false, 
        swapped: false, 
        alignOffset: 30 
      }
    }

    if (!nodeData) return;
    m.addNodeData(nodeData);

    // Find wall part and its link, update link data and move the parts
    const node = e.diagram.findNodeForData(nodeData);
    if (node && node.category === 'wallPart') {
      const link = e.diagram.findLinkForKey(node.data.linkKey);
      if (!link) return;
      let wallparts = link.data.wallparts.slice();
      if (wallparts && wallparts instanceof Array) {
        wallparts.push(node.key);
      } else {
        wallparts = [node.key];
      }
      m.set(link.data, 'wallparts', wallparts);
      moveWallPart(node);
    }
  })
}

// Split a wall into two
export function splitWall(e: go.InputEvent, wall: go.Link) {
  e.diagram.commit(() => {
    if (!wall.fromNode || !wall.toNode) return;
    // Store link's original from and to node before modification
    const ogFromNode = wall.fromNode;
    const ogToNode = wall.toNode;
    // Get point user clicked on link, project onto wall, snap to grid
    let point = wallContextMenu.location.copy();
    point.projectOntoLineSegmentPoint(ogFromNode.location, ogToNode.location);
    // Add a new wall point and join it into the wall
    const nodeData = { category: 'wallPoint', loc: go.Point.stringify(point), size: wall.data.width, rooms: [] }
    e.diagram.model.addNodeData(nodeData);
    const newNode = e.diagram.findNodeForData(nodeData);
    if (!newNode) return;
    WallBuilderTool.joinFromWall([point, wall], newNode, e.diagram);
    // Re-parent wallparts
    wall.data.wallparts.forEach((key: number) => {
      const part = e.diagram.findNodeForKey(key);
      if (part instanceof go.Node && part.category === 'wallPart') findWallPartParent(part);
    })
    miterPoint(newNode);
    // Add new node to rooms that both the original from and to node were a part of
    ogFromNode.data.rooms.forEach((key: number) => {
      if (!ogToNode.data.rooms.includes(key)) return;
      const room = e.diagram.findNodeForKey(key);
      if (!room || room.category !== 'room') return;
      addWallPointToRoom(room, newNode);
    })
  })
}

// Change selected wall thicknesses by a given amount
export function modifyWallSize(e: go.InputEvent, clickedLink: go.Link, amount: number) {
  e.diagram.commit(diag => {
    // Loop through diagram selections
    diag.selection.each(part => {
      const link = part;
      if (!(link instanceof go.Link && link.category === 'wallLink')) return;
      if (!link.fromNode || !link.toNode) return;
      // Set valid thickness
      const thickness = Math.min(Math.max(2, link.data.width + amount), 42);
      diag.model.set(link.data, 'width', thickness);
      // Update from and to node sizes
      const fromSize = WallBuilderTool.findMaxLinkWidth(link.fromNode);
      const toSize = WallBuilderTool.findMaxLinkWidth(link.toNode);
      diag.model.set(link.fromNode.data, 'size', fromSize);
      diag.model.set(link.toNode.data, 'size', toSize);
      // Miter points, update room areas, re-parent wall parts;
      miterPoint(link.fromNode);
      miterPoint(link.toNode);
      updateRoomAreaForWallPoint(link.fromNode);
      updateRoomAreaForWallPoint(link.toNode);
      link.data.wallparts.forEach((key: number) => {
        const wallPart = diag.findNodeForKey(key);
        if (!wallPart) return;
        const prevSize = go.Size.parse(wallPart.data.size);
        const newSize = new go.Size(prevSize.width, thickness);
        diag.model.set(wallPart.data, 'size', go.Size.stringify(newSize));
      })
    })
  })
}