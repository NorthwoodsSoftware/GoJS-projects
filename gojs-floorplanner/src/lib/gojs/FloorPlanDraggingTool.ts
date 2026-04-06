import go, { DraggingTool } from 'gojs';
import { isMac } from './FloorPlanTemplates';

// Custom dragging tool that handles floorplan specific collection management
export class FloorPlanDraggingTool extends DraggingTool {
  constructor(init?: Partial<FloorPlanDraggingTool>) {
    super();
    this.isGridSnapEnabled = true;
    this.name = 'FloorPlanDraggingTool';
    if (init) Object.assign(this, init);
  }

  computeEffectiveCollection(parts: go.Iterable<go.Part>, options: go.DraggingOptions): go.Map<go.Part, go.DraggingInfo> {
    const partMap = super.computeEffectiveCollection(parts, options);
    const copyKeyDown = isMac ? this.diagram.lastInput.alt : this.diagram.lastInput.control;
    // If copying parts use the default drag
    if (copyKeyDown) {
      return partMap;
    }
    // Collect nodes by category
    const wallpoints: Array<go.Node> = [];
    const wallparts: Array<go.Node> = [];
    const furniture: Array<go.Node> = [];
    const it = partMap.iterator;
    while (it.next()) {
      const part = it.key as go.Node;
      switch (part.category) {
        case 'wallPoint':
          wallpoints.push(part);
          break;
        case 'wallPart':
          wallparts.push(part);
          break;
        case '':
          furniture.push(part);
          break;
        default:
          break;
      }
    }
    
    // If just one wall part (window/door) is being dragged, return normally
    if (wallparts.length === 1 && wallpoints.length === 0 && furniture.length === 0) return partMap;

    // Otherwise remove wall parts
    wallparts.forEach(node => {
      partMap.delete(node);
    })

    // If the user has one wall selected, allow them to individually drag one of the wall points by clicking on it
    if (wallpoints.length === 2 && furniture.length === 0 && partMap.count === 3) {
      const pt1 = wallpoints[0];
      const pt2 = wallpoints[1];
      // Search for the wall link
      let link: go.Link | null = null;
      const newIt = partMap.iterator;
      while (newIt.next() && !link) {
        const part = newIt.key;
        if (part instanceof go.Link && 
          (part.category === 'wallLink' || part.category === 'divider' || part.category === 'measurement')) {
            link = part;
          }
      }
      // If found and it connects the two wall points, search under the mouse point
      if (link && (link.fromNode === pt1 || link.fromNode === pt2) && (link.toNode === pt1 || link.toNode === pt2)) {
        const clicked = this.diagram.findPartAt(this.diagram.lastInput.documentPoint);
        // If one of the wall points was clicked, remove the other and the link
        if (clicked === pt1) {
          partMap.delete(pt2);
          partMap.delete(link);
          return partMap;
        } else if (clicked === pt2) {
          partMap.delete(pt1);
          partMap.delete(link);
          return partMap;
        } // If the link was selected, the part map won't be altered
      }
    }

    return partMap;
  }

  // Remove single wall points that don't have links if any were copied
  doMouseUp(): void {
    if (this.copiedParts) {
      const partsToRemove: Array<go.Key> = [];
      this.copiedParts.forEach((value: go.DraggingInfo, key: go.Part, map: go.Map<go.Part, go.DraggingInfo>) => {
        if (key instanceof go.Node && key.category === 'wallPoint' && key.findLinksConnected().count === 0) {
          partsToRemove.push(key.key);
        }
      }, this)
      window.requestAnimationFrame(() => { // Ensure removal happens after part added
        const prevSkips = this.diagram.skipsUndoManager;
        this.diagram.skipsUndoManager = true;
        partsToRemove.forEach(key => {
          const node = this.diagram.findNodeForKey(key);
          if (node) {
            this.diagram.remove(node);
          }
        })
        this.diagram.skipsUndoManager = prevSkips;        
      })
    }
    super.doMouseUp();
  }
}