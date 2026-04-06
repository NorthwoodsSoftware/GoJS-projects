import go from 'gojs';

// Custom tool for resizing windows and doors
export class WallPartResizingTool extends go.ResizingTool {
  constructor(init?: any) {
    super();
    this.isGridSnapEnabled = true;
    if (init) Object.assign(this, init);
  }

  canStart(): boolean {
    // Ensures this tool only starts when dragging a wall part
    const handle = this.findToolHandleAt(this.diagram.firstInput.documentPoint, this.name);
    if (!handle || !handle.part || !(handle.part instanceof go.Adornment)) return false;
    let node = handle.part.adornedObject;
    if (!node) return false;
    while (node.part && node.part !== node) node = node.part;
    if (!(node instanceof go.Node)) return false;
    if (node.category !== 'wallPart') return false;
    return super.canStart();
  }

  computeMinSize(): go.Size {
    // Sets minimum height, uses the parts current height
    let part = this.adornedObject;
    if (!part) return new go.Size(NaN, NaN);
    while (part.part && part.part !== part) part = part.part;
    if (!(part instanceof go.Node)) return new go.Size(NaN, NaN);
    const prevSize = go.Size.parse(part.data.size);
    return new go.Size(15, prevSize.height);
  }

  computeMaxSize(): go.Size {
    // Shape being resized
    const shape = this.adornedObject;
    // Part variable that finds the node via while loop
    let part = this.adornedObject;
    if (!part || !shape) return new go.Size(NaN, NaN);
    while (part.part && part.part !== part) part = part.part;
    if (!(part instanceof go.Node)) return new go.Size(NaN, NaN);
    // Stores the size to get thickness
    const prevSize = go.Size.parse(part.data.size);

    // Finds which handle is being used
    const handle = this.findToolHandleAt(this.diagram.firstInput.documentPoint, this.name);
    if (!handle || !handle.name) return new go.Size(NaN, NaN);

    // Finds link and end point locations
    const link = this.diagram.findLinkForKey(part.data.linkKey);
    if (!link || !link.fromNode || !link.toNode) return new go.Size(Infinity, prevSize.height);
    const fromPoint = link.fromNode.location;
    const toPoint = link.toNode.location;
    const leftHandleLoc = shape.getDocumentPoint(go.Spot.Left);
    const rightHandleLoc = shape.getDocumentPoint(go.Spot.Right);

    // Sets width so user can't drag beyond a wall point
    let width: number;
    if (handle.name === 'RIGHTHANDLE') {
      width = Math.sqrt(leftHandleLoc.distanceSquaredPoint(toPoint)) - link.toNode.data.size / 2
    } else if (handle.name === 'LEFTHANDLE') {
      width = Math.sqrt(rightHandleLoc.distanceSquaredPoint(fromPoint)) - link.fromNode.data.size / 2
    } else {
      return new go.Size(NaN, NaN);
    }

    return new go.Size(width, prevSize.height);
  }

  resize(newr: go.Rect): void {
    let part = this.adornedObject;
    if (!part) {
      super.resize(newr);
      return;
    };
    while (part.part && part.part !== part) part = part.part;
    // Resizes windows
    if (!(part instanceof go.Node) || part.data.type !== 'door') {
      super.resize(newr);
      return;
    };

    // Adjusts the offset of the door sweep shape to keep it aligned while resizing
    const offset = part.data.alignOffset >= 0 ? newr.width / 2 : -(newr.width) / 2
    this.diagram.model.set(part.data, 'alignOffset', offset);

    // Resize doors
    super.resize(newr);
  }
}