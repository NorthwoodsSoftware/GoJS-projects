import * as go from 'gojs';
import { isPerson, positionPeopleAtSeats } from '@/gojs/functions';
import { useEditorStore } from '@/store';

// Automatically drag people Nodes along with the table Node at which they are seated.
export class SpecialDraggingTool extends go.DraggingTool {
  constructor(init?: Partial<go.DraggingTool>) {
    super();
    if (init) Object.assign(this, init);
  }

  override doActivate() {
    const editorStore = useEditorStore();
    editorStore.open = false;
    super.doActivate();
  }

  override computeEffectiveCollection(parts: go.Set<go.Part> | go.List<go.Part>) {
    const map = super.computeEffectiveCollection(parts, this.dragOptions);
    // for each Node representing a table, also drag all of the people seated at that table
    parts.each((table) => {
      if (table.diagram === null || isPerson(table)) return; // ignore persons
      // this is a table Node, find all people Nodes using the same table key
      for (const nit = table.diagram.nodes; nit.next(); ) {
        const n = nit.value;
        if (isPerson(n) && n.data.table === table.data.key) {
          if (!map.has(n)) map.add(n, new go.DraggingInfo(n.location.copy()));
        }
      }
    });
    return map;
  }
}
// end SpecialDraggingTool

// Automatically move seated people as a table is rotated, to keep them in their seats.
// Note that because people are separate Nodes, rotating a table Node means the people Nodes
// are not rotated, so their names (TextBlocks) remain horizontal.
export class HorizontalTextRotatingTool extends go.RotatingTool {
  constructor(init?: Partial<go.RotatingTool>) {
    super();
    if (init) Object.assign(this, init);
  }

  override rotate(newangle: number) {
    super.rotate(newangle);
    const node = this.adornedObject?.part;
    if (node) positionPeopleAtSeats(node);
  }
}
// end HorizontalTextRotatingTool
