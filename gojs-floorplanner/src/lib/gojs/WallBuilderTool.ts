import go from 'gojs';
import type { FloorPlanDraggingTool } from './FloorPlanDraggingTool';
import * as FPUtils from '$lib/gojs/FloorPlanUtils';
import { get } from 'svelte/store';
import { useFeet } from '$lib/stores/stores';

// Tool for drawing walls, measurements, and dividers on the diagram
export class WallBuilderTool extends go.Tool {
  public buildType: string; // Can be set by diagram during use
  private fromNode: go.Node | null;
  private toNode: go.Node | null;
  private isNewFromNode: boolean;
  private _temporaryLink: go.Link;
  private _temporaryToNode: go.Node;
  private isFirstMove: boolean;
  private wallTemplate: go.Link;
  private dividerTemplate: go.Link;
  private measurementTemplate: go.Link;
  private usingFeet: boolean;
  // Variables for storing references to measure icons while drawing walls
  private infoPanel: go.GraphObject | null;
  private lengthTextTop: go.GraphObject | null;
  private topLine: go.GraphObject | null;
  private lengthTextBot: go.GraphObject | null;
  private botLine: go.GraphObject | null;
  private arrowLT: go.GraphObject | null;
  private arrowRT: go.GraphObject | null;
  private arrowLB: go.GraphObject | null;
  private arrowRB: go.GraphObject | null;

  constructor(nodeTemplate : go.Node, wallLinkTemplate : go.Link, dividerLinkTemplate: go.Link, measurementLinkTemplate: go.Link) {
    super();
    this.name = 'WallBuilder';
    this.fromNode = null;
    this.toNode = null;
    this.isNewFromNode = false;
    this._temporaryLink = wallLinkTemplate;
    this._temporaryToNode = nodeTemplate;
    this.isFirstMove = true;
    this.buildType = 'wall';
    this.wallTemplate = wallLinkTemplate;
    this.dividerTemplate = dividerLinkTemplate;
    this.measurementTemplate = measurementLinkTemplate;
    this.infoPanel = null;
    this.lengthTextTop = null;
    this.topLine = null;
    this.lengthTextBot = null;
    this.botLine = null;
    this.arrowLT = null;
    this.arrowRT = null;
    this.arrowLB = null;
    this.arrowRB = null;
    this.usingFeet = false;
  }

  doActivate() {
    this.startTransaction(this.name);
  }

  doMouseDown() {
    // Set correct link template
    if (this.buildType === 'divider') {
      this._temporaryLink = this.dividerTemplate;
    } else if (this.buildType === 'wall') {
      this._temporaryLink = this.wallTemplate;
    } else {
      this._temporaryLink = this.measurementTemplate;
    }

    // Search for nearby wall points, if found use it to start link, otherwise add a new one
    const point = this.diagram.lastInput.documentPoint;
    let closestNode = WallBuilderTool.findClosestWallPoint(point, this.diagram);

    // If measurement or holding alt key, don't snap, otherwise do
    if (closestNode && this.buildType !== 'measurement' && !this.diagram.lastInput.alt) {
      this.fromNode = closestNode;
    } else {
      let nodeData;
      const dragTool = (this.diagram.toolManager.findTool('FloorPlanDraggingTool') as FloorPlanDraggingTool);

      // Unless holding shift, snap new wall point to grid
      if (dragTool.isGridSnapEnabled && !this.diagram.lastInput.shift) {
        const grdszx = isNaN(dragTool.gridSnapCellSize.width) ? 10 : dragTool.gridSnapCellSize.width;
        const grdszy = isNaN(dragTool.gridSnapCellSize.height) ? 10 : dragTool.gridSnapCellSize.height;
        const grdpt = new go.Point(Math.round(point.x / grdszx) * grdszx, Math.round(point.y / grdszy) * grdszy);
        nodeData = { category: 'wallPoint', loc: go.Point.stringify(grdpt), size: 10, miterPoints: [], rooms: [] }
      } else {
        nodeData = { category: 'wallPoint', loc: go.Point.stringify(point), size: 10, miterPoints: [], rooms: [] }
      }

      // Add the new point to the diagram
      this.diagram.model.addNodeData(nodeData);
      this.fromNode = this.diagram.findNodeForData(nodeData);
      this.isNewFromNode = true;
    }
  }

  doMouseMove() {
    if (this.isFirstMove) {
      // Initialize instance variables
      this.diagram.add(this._temporaryToNode);
      this._temporaryLink.fromNode = this.fromNode;
      this._temporaryLink.fromPortId = '';
      this._temporaryLink.toNode = this._temporaryToNode;
      this._temporaryLink.fromPortId = '';
      this.diagram.add(this._temporaryLink);
      // Store references to objects that make up the wall and divider real time measurements
      if (this.buildType !== 'measurement') {
        this.infoPanel = this._temporaryLink.findObject('INFOPANEL');
        this.lengthTextTop = this._temporaryLink.findObject('LENGTHTEXTTOP');
        this.topLine = this._temporaryLink.findObject('TOPLINE');
        this.lengthTextBot = this._temporaryLink.findObject('LENGTHTEXTBOT');
        this.botLine = this._temporaryLink.findObject('BOTLINE');
        this.arrowLT = this._temporaryLink.findObject('ARROWLT');
        this.arrowRT = this._temporaryLink.findObject('ARROWRT');
        this.arrowLB = this._temporaryLink.findObject('ARROWLB');
        this.arrowRB = this._temporaryLink.findObject('ARROWRB');
      }
      this.usingFeet = get(useFeet) ?? false;
      this.isFirstMove = false;
    }

    // Get units
    let GRIDSCALE = this.usingFeet ? 15.2399995123 : 50;
    let UNIT = this.usingFeet ? 'ft' : 'm';

    const dragTool = (this.diagram.toolManager.findTool('FloorPlanDraggingTool') as FloorPlanDraggingTool);
    const point = this.diagram.lastInput.documentPoint;

    // Snaps temporary node to grid if not holding shift
    if (dragTool.isGridSnapEnabled && !this.diagram.lastInput.shift) {
      const grdszx = isNaN(dragTool.gridSnapCellSize.width) ? 10 : dragTool.gridSnapCellSize.width;
      const grdszy = isNaN(dragTool.gridSnapCellSize.height) ? 10 : dragTool.gridSnapCellSize.height;
      const grdpt = new go.Point(Math.round(point.x / grdszx) * grdszx, Math.round(point.y / grdszy) * grdszy);
      this._temporaryToNode.location = grdpt;
    } else {
      this._temporaryToNode.location = point;
    }

    // If control is held, the link can only be drawn orthogonally
    if (this.diagram.lastInput.control && this.fromNode) {
      const dx = this.fromNode.location.x - this._temporaryToNode.location.x;
      const dy = this.fromNode.location.y - this._temporaryToNode.location.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this._temporaryToNode.location = new go.Point(this._temporaryToNode.location.x, this.fromNode.location.y);
      } else {
        this._temporaryToNode.location = new go.Point(this.fromNode.location.x, this._temporaryToNode.location.y);
      }
    }

    // Update text on measurement link in real time
    if (this.buildType === 'measurement') {
      const textBlock = this._temporaryLink.findObject('MEASUREMENTTEXT');
      if (!this.fromNode || !textBlock || !(textBlock instanceof go.TextBlock)) return;
      const length = Math.sqrt(this.fromNode.location.distanceSquaredPoint(this._temporaryToNode.location));
      textBlock.text = String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT;
      return;
    }

    // Update measuring icon in real time if building walls or dividers
    if (!this.fromNode) return;
    if (!this.lengthTextTop || !(this.lengthTextTop instanceof go.TextBlock)) return;
    if (!this.lengthTextBot || !(this.lengthTextBot instanceof go.TextBlock)) return;
    if (!this.infoPanel || !this.topLine || !this.botLine) return;
    if (!this.arrowLT || !this.arrowRT || !this.arrowLB || !this.arrowRB) return;
    const length = Math.sqrt(this.fromNode.location.distanceSquaredPoint(this._temporaryToNode.location));
    const dy = this._temporaryToNode.location.y - this.fromNode.location.y;
    const dx = this._temporaryToNode.location.x - this.fromNode.location.x;
    const angle = Math.atan2(dy, dx) * (360 / (2 * Math.PI));
    this.lengthTextTop.text = String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT;
    this.lengthTextBot.text = String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT;
    // Keep text from going upside down
    if (Math.abs(angle) > 90) {
      this.lengthTextTop.angle = 180;
      this.lengthTextBot.angle = 180;
    } else {
      this.lengthTextTop.angle = 0;
      this.lengthTextBot.angle = 0;
    }
    this.topLine.desiredSize = new go.Size(length, 2);
    this.botLine.desiredSize = new go.Size(length, 2);
    this.infoPanel.angle = angle;
    this.arrowLT.alignment = new go.Spot(0.5, 0.5, -(length / 2 - 4), -16);
    this.arrowRT.alignment = new go.Spot(0.5, 0.5, (length / 2 - 4), -16);
    this.arrowLB.alignment = new go.Spot(0.5, 0.5, -(length / 2 - 4), 16);
    this.arrowRB.alignment = new go.Spot(0.5, 0.5, (length / 2 - 4), 16);
  }

  doMouseUp() {
    if (!this.fromNode) return;
    if (this.isFirstMove) { // Prevent creating walls or points on just a click
      if (this.isNewFromNode) this.diagram.remove(this.fromNode);
      this.fromNode = null;
      this.toNode = null;
      this.isNewFromNode = false;
      this.isFirstMove = true;
      this.diagram.commitTransaction(this.name);
      this.stopTool();
      return;
    }
    const prelength = this.fromNode.location.distanceSquaredPoint(this._temporaryToNode.location);
    // Search for link points on both ends of the temporary link
    const nodePoint = this._temporaryToNode.getDocumentPoint(go.Spot.Center);
    this.diagram.remove(this._temporaryToNode);
    // const point = this.diagram.lastInput.documentPoint;
    let closestNode = WallBuilderTool.findClosestWallPoint(nodePoint, this.diagram);
    const fromLinkAndPoint = WallBuilderTool.findPointAndLink(
      this.fromNode.location, 
      nodePoint, 
      this.diagram,
      this.buildType
    );
    const toLinkAndPoint = WallBuilderTool.findPointAndLink(
      nodePoint, 
      this.fromNode.location, 
      this.diagram, 
      this.buildType
    );
    const model = this.diagram.model as go.GraphLinksModel;

    // If alt key is held down, to node will not snap
    // Linking to existing node
    if (closestNode && closestNode !== this.fromNode && !this.diagram.lastInput.alt && this.buildType !== 'measurement') {
      let linkData;
      if (this.buildType === 'divider') {
        linkData = { 
          category: 'divider', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: closestNode.key, 
          toPortId: ''
        }
      } else {
        linkData = { 
          category: 'wallLink', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: closestNode.key, 
          toPortId: '',
          width: 10,
          wallparts: []
        }
      }

      (this.diagram.model as go.GraphLinksModel).addLinkData(linkData);
      this.toNode = closestNode;
      if (this.isNewFromNode) { // Attempts to join from point to a wall
        WallBuilderTool.joinFromWall(fromLinkAndPoint, this.fromNode, this.diagram);
      }

    // Linking to new point on a wall
    } else if (!closestNode && !this.diagram.lastInput.alt && toLinkAndPoint[0] && toLinkAndPoint[1] && this.buildType !== 'measurement') {
      const point = toLinkAndPoint[0];
      const link = toLinkAndPoint[1];
      const wallparts = link.data.wallparts.slice();
      const nodeData = { category: 'wallPoint', loc: go.Point.stringify(point), size: link.data.width, miterPoints: [], rooms: [] };
      model.addNodeData(nodeData);
      this.toNode = this.diagram.findNodeForData(nodeData);
      if (!this.toNode) return;

      const midNode = this.toNode;
      const firstNode = link.fromNode
      const lastNode = link.toNode;
      if (!lastNode || !firstNode) return;

      // Splits link such that the longer section is the original link
      const path = link.path;
      if (!(path && path.geometry)) return;
      const localpt = path.getLocalPoint(point);
      const frac = path.geometry.getFractionForPoint(localpt);

      let fromKey;
      let toKey;
      if (frac < .5) {
        link.fromNode = midNode;
        fromKey = firstNode.key;
        toKey = midNode.key;
      } else {
        link.toNode = midNode;
        fromKey = midNode.key;
        toKey = lastNode.key;
      }

      // Adds new link with the same dimensions as the original
      model.addLinkData({ 
        category: link.category, 
        from: fromKey, 
        fromPortId: '', 
        to: toKey, 
        toPortId: '',
        width: link.data.width,
        wallparts: []
      });

      // Link data for the link being drawn
      let linkData;
      if (this.buildType === 'divider') {
        linkData = { 
          category: 'divider', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: midNode.key, 
          toPortId: ''
        }
      } else {
        linkData = { 
          category: 'wallLink', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: midNode.key, 
          toPortId: '',
          width: 10,
          wallparts: []
        }
      }

      // Find rooms that both the original from and to node were part of and add the middle node to them
      const smallerRoomSet = firstNode.data.rooms.length < lastNode.data.rooms.length ? new Set(firstNode.data.rooms) : new Set(lastNode.data.rooms);
      const largerRoomArray = firstNode.data.rooms.length >= lastNode.data.rooms.length ? firstNode.data.rooms : lastNode.data.rooms;
      const intersectRoomArray = largerRoomArray.filter((n: number) => smallerRoomSet.has(n));

      this.diagram.model.set(midNode.data, 'rooms', intersectRoomArray);
      intersectRoomArray.forEach((key: number) => {
        const room = this.diagram.findNodeForKey(key);
        if (!(room && room.category === 'room')) return;
        FPUtils.addWallPointToRoom(room, midNode);
      })

      // Re-parent wallparts
      wallparts.forEach((key: number) => {
        const part = this.diagram.findNodeForKey(key);
        if (part instanceof go.Node && part.category === 'wallPart') FPUtils.findWallPartParent(part);
      })

      model.addLinkData(linkData);
      if (this.isNewFromNode) { // Attempts to join from point to a wall
        WallBuilderTool.joinFromWall(fromLinkAndPoint, this.fromNode, this.diagram);
      }

    // Linking to new point not on a wall
    } else if ((!closestNode || this.diagram.lastInput.alt) || (this.buildType === 'measurement' && prelength > 4)) {

      let nodeData;
      if (this.diagram.lastInput.alt || this.buildType === 'measurement') {
        nodeData = { category: 'wallPoint', loc: go.Point.stringify(this._temporaryToNode.location), size: 10, miterPoints: [], rooms: [] }
      } else {
        nodeData = { category: 'wallPoint', loc: go.Point.stringify(nodePoint), size: 10, miterPoints: [], rooms: [] }
      }
      model.addNodeData(nodeData);
      this.toNode = this.diagram.findNodeForData(nodeData);
      if (!this.toNode) return;

      let linkData;

      if (this.buildType === 'divider') {
        linkData = {
          category: 'divider', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: this.toNode.key, 
          toPortId: ''
        }
      } else if (this.buildType === 'wall') {
        linkData = {
          category: 'wallLink', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: this.toNode.key, 
          toPortId: '',
          width: 10,
          wallparts: []
        }
      } else {
        linkData = {
          category: 'measurement', 
          from: this.fromNode.key, 
          fromPortId: '', 
          to: this.toNode.key, 
          toPortId: ''
        }
      }

      model.addLinkData(linkData);
      if (this.buildType !== 'measurement' && !this.diagram.lastInput.alt && this.isNewFromNode) {
        // Attempts to join from point, need to check alt key and build type here too
        WallBuilderTool.joinFromWall(fromLinkAndPoint, this.fromNode, this.diagram);
      }

    } else if (this.isNewFromNode) {
      // Link not created
      this.diagram.remove(this.fromNode);
      this.fromNode = null;
      this.toNode = null;
    }

    if (this.fromNode && this.toNode) {
      // Adjust sizes of from and to nodes
      const fromSize = WallBuilderTool.findMaxLinkWidth(this.fromNode) 
      const toSize = WallBuilderTool.findMaxLinkWidth(this.toNode);
      this.diagram.model.set(this.fromNode.data, 'size', fromSize);
      this.diagram.model.set(this.toNode.data, 'size', toSize);
    }
    this.isNewFromNode = false;
    this.isFirstMove = true;
    // Miter points
    if (this.fromNode) FPUtils.miterPoint(this.fromNode);
    if (this.toNode) FPUtils.miterPoint(this.toNode);
    this.diagram.commitTransaction(this.name);
    this.stopTool();
  }

  // Returns closest wall point node, if none in range return null
  static findClosestWallPoint(point: go.Point, diagram: go.Diagram, currentWallPt?: go.Node) {
    let closestNode: any;
    if (isNaN(point.x) || isNaN(point.y)) return null;
    const nearbyNodes = diagram.findObjectsNear(point, 
      10, 
      x => {return pred(x) ? x : null}
    );

    // Search predicate function, returns false if wall point is connected to a measurement link
    function pred(part: any) : boolean {
      if (!(part instanceof go.Node)) return false;
      if (part.category !== 'wallPoint') return false;
      if (currentWallPt && part === currentWallPt) return false;
      const links = part.findLinksConnected();
      let found = false;
      while (links.next() && !found) {
        if (links.value.category === 'measurement') {
          found = true;
        }
      }
      return !found;
    }

    if (nearbyNodes.size > 0) {
      // Loop through nearby eligible points and find the closest one
      closestNode = nearbyNodes.first();
      nearbyNodes.each(node => {
        const nodePoint = (node as go.Node).location;
        const closestNodePoint = closestNode.location;
        const prevDist = go.Point.distanceSquared(point.x, point.y, closestNodePoint.x, closestNodePoint.y);
        const dist = go.Point.distanceSquared(point.x, point.y, nodePoint.x, nodePoint.y);

        if (dist < prevDist) closestNode = node;
      })
    }

    return closestNode ?? null;
  }

  // Returns the closest link and the point on that link to connect to
  static findPointAndLink(point: go.Point, fromPoint: go.Point, diagram: go.Diagram, buildType?: string, currentLink?: go.Link) : [go.Point | null, go.Link | null] {
    // If building dividers, search for dividers and walls, if building walls search only for walls
    const nearbyLinks = diagram.findObjectsNear(
      point, 
      5, 
      x => {
        if (buildType === 'divider') {
          return (x as go.Link).category === 'wallLink' || (x as go.Link).category === 'divider' ? x : null
        } else {
          return (x as go.Link).category === 'wallLink' ? x : null
        }
      }
    );
    
    if (nearbyLinks.size > 0 && fromPoint) {
      // Manually searches by drawing a straight line from the proposed link
      const dy = point.y - fromPoint.y;
      const dx = point.x - fromPoint.x;
      const angle = Math.atan2(dy, dx);
      const length = 5;
      const width = Math.cos(angle) * length;
      const height = Math.sin(angle) * length;

      // Check at each point along the line (extending by 1px each time) until a link is found
      let count = 1;
      let found = false;
      let newPoint: go.Point | null;
      let link: go.Link | null = null;
      while (count <= length && !found) {
        newPoint = new go.Point(point.x + (width / length) * count, point.y + (height / length) * count);
        const parts = diagram.findPartsAt(newPoint);
        newPoint = new go.Point(point.x - (width / length) * count, point.y - (height / length) * count);
        parts.addAll(diagram.findPartsAt(newPoint));
        parts.each(part => {
          if (currentLink && part === currentLink) return; // Prevents returning a provided link
          if (buildType === 'divider') {
            if ((part as go.Link).category === 'wallLink' || (part as go.Link).category === 'divider') link = (part as go.Link);
          } else {
            if ((part as go.Link).category === 'wallLink') link = (part as go.Link);
          }
        })
        count++;
        if (link) found = true;
      }
      if (found) {
        // If a link is found project the point onto it
        link = (link! as go.Link);
        if (!link || !link.fromNode || !link.toNode) return [null, null];
        const fp = link.fromNode.location;
        const tp = link.toNode.location;
        point.projectOntoLineSegment(fp.x, fp.y, tp.x, tp.y);
        let adjPoint = point;
        // Use floor plan dragging tool, if not found default to the standard one
        let dragTool = (diagram.toolManager.findTool('FloorPlanDraggingTool') as FloorPlanDraggingTool);
        if (!dragTool) dragTool = diagram.toolManager.draggingTool;
        if (dragTool.isGridSnapEnabled) {
          // Adjusts for intentionally vertical or horizontal links
          const gridsz = dragTool.gridSnapCellSize;
          const gridszx = gridsz.width ? gridsz.width : 10;
          const gridszy = gridsz.height ? gridsz.height : 10;
          let adjx;
          let adjy;
          if (Math.abs(fromPoint.x - point.x) < gridszx) adjx = fromPoint.x;
          if (Math.abs(fromPoint.y - point.y) < gridszy) adjy = fromPoint.y;
          adjPoint = new go.Point(adjx !== undefined ? adjx : point.x, adjy !== undefined ? adjy : point.y);
        }
        return [adjPoint, link];
      } else {
        return [null, null];
      }
    } else {
      return [null, null];
    }
  }

  // Inserts fromNode into existing wall link
  static joinFromWall(fromLinkAndPoint : [go.Point | null, go.Link | null], fromNode: go.Node, diagram: go.Diagram) {
    const point = fromLinkAndPoint[0];
    const link = fromLinkAndPoint[1];
    if (point && link && fromNode) {
      const wallparts = link.data.wallparts.slice();
      const midNode = fromNode;
      midNode.location = point;
      const firstNode = link.fromNode;
      const lastNode = link.toNode;
      if (!lastNode || !firstNode) return;

      // Remakes link on correct half of wall
      const path = link.path;
      if (!path?.geometry) return;
      const localpt = path.getLocalPoint(point);
      const frac = path.geometry.getFractionForPoint(localpt);

      let fromKey;
      let toKey;
      if (frac < .5) {
        link.fromNode = midNode;
        fromKey = firstNode.key;
        toKey = midNode.key;
      } else {
        link.toNode = midNode;
        fromKey = midNode.key;
        toKey = lastNode.key;
      }

      let newLinkData;
      if (link.category === 'wallLink') {
        newLinkData = { 
          category: 'wallLink', 
          from: fromKey, 
          fromPortId: '', 
          to: toKey, 
          toPortId: '',
          width: link.data.width,
          wallparts: []
        }
      } else {
        newLinkData = { 
          category: link.category, 
          from: fromKey, 
          fromPortId: '', 
          to: toKey, 
          toPortId: ''
        }
      }
      (diagram.model as go.GraphLinksModel).addLinkData(newLinkData);
      
      // Find rooms that both the original from and to node were part of and add the middle node to them
      const smallerRoomSet = firstNode.data.rooms.length < lastNode.data.rooms.length ? new Set(firstNode.data.rooms) : new Set(lastNode.data.rooms);
      const largerRoomArray = firstNode.data.rooms.length >= lastNode.data.rooms.length ? firstNode.data.rooms : lastNode.data.rooms;
      const intersectRoomArray = largerRoomArray.filter((n: number) => smallerRoomSet.has(n));

      diagram.model.set(midNode.data, 'rooms', intersectRoomArray);
      intersectRoomArray.forEach((key: number) => {
        const room = diagram.findNodeForKey(key);
        if (!(room && room.category === 'room')) return;
        FPUtils.addWallPointToRoom(room, midNode);
      })

      // Re-parent wallparts
      wallparts.forEach((key: number) => {
        const part = diagram.findNodeForKey(key);
        if (part instanceof go.Node && part.category === 'wallPart') FPUtils.findWallPartParent(part);
      })

    } else return;
  }

  // Find the width of the widest link coming out of a given node
  static findMaxLinkWidth(node: go.Node) : number {
    const links = node.findLinksConnected();
    const first = links.first()?.findObject('MAIN');
    if (!first) return 10;
    let max = (first as go.Shape).strokeWidth;
    links.each(link => {
      const width = (link.findObject('MAIN') as go.Shape)?.strokeWidth;
      if (width > max) max = width;
    })
    return Math.max(max, 6);
  }
}