"use strict";
/*
*  Copyright (C) 1998-2022 by Northwoods Software Corporation. All Rights Reserved.
*/

// A custom Layout that lays out nodes and links via a Graphviz dot layout

/*
* This is an extension and not part of the main GoJS library.
* Note that the API for this class may change with any version, even point releases.
* If you intend to use an extension in production, you should copy the code to your own source directory.
* Extensions can be found in the GoJS kit under the extensions or extensionsJSM folders.
* See the Extensions intro page (https://gojs.net/latest/intro/extensions.html) for more information.
*/

import * as go from 'gojs';

/**
 * A custom {@link Layout} lays out nodes and links via a Graphviz dot layout.
 *
 * This layout does not currently support Groups or ports.
 */
export class DotLayout extends go.Layout {
  /**
   * Constructs a DotLayout and sets the {@link #isRouting} property to true.
   * @param {*} graphviz A loaded Graphviz instance.
   */
  constructor(graphviz) {
    super();
    this.isRouting = true;
    this.graphviz = graphviz;
  }

  /**
   * Use a LayoutNetwork that always creates DotEdges.
   */
  createNetwork() {
    const net = new go.LayoutNetwork(this);
    net.createEdge = () => new DotEdge(net);
    return net;
  }

  /**
   * This method actually positions all of the Nodes and Links.
   * @param {*} coll A Diagram, Group, or collection of {@link Part}s.
   */
  doLayout(coll) {
    const diagram = this.diagram;
    if (!diagram) throw new Error("No diagram available in DotLayout.doLayout.");

    if (this.network === null) {
      this.network = this.makeNetwork(coll);
    }
    if (this.network.vertexes.count === 0) {
      this.network = null;
      return;
    }

    this.arrangementOrigin = this.initialOrigin(this.arrangementOrigin);

    // generate DOT language graph: https://graphviz.org/doc/info/lang.html
    let dot = `digraph {
  node [shape="box" fixedsize=true fontname="arial"]
  edge [arrowhead="none"]\n`;
    const vit = this.network.vertexes.iterator;
    while (vit.next()) {
        const v = vit.value;
        const node = v.node;
        if (!node) continue;
        if (node instanceof go.Group) throw new Error("DotLayout does not currently support Groups.");
        // divide size by 96 since Graphviz expects inches
        dot += `  ${node.key} [width=${node.actualBounds.width / 96} height=${node.actualBounds.height / 96}]\n`;
    }
    const eit = this.network.edges.iterator;
    while (eit.next()) {
        const e = eit.value;
        const link = e.link;
        if (!link) continue;
        const fromNode = link.fromNode;
        const toNode = link.toNode;
        if (!(fromNode && toNode)) continue;
        // include the Link key as an ID for quick lookup from the output
        dot += `  ${fromNode.key} -> ${toNode.key} [id=${link.key}]\n`;
    }
    dot += "}";

    // perform Graphviz dot layout via Graphviz WASM
    const jsonStr = this.graphviz.dot(dot, "json0");
    const json = JSON.parse(jsonStr);

    const h = parseFloat(json.bb.substring(json.bb.lastIndexOf(",") + 1));  // save height so we can convert y values
    // set vertex points based on "objects" output
    for (const n of json.objects) {  // nodes
      const node = diagram.findNodeForKey(n.name);
      const vertex = this.network.findVertex(node);
      const { x, y } = this.parsePos(n.pos, h);
      vertex.centerX = x;
      vertex.centerY = y;
    }
    // set link points based on "edges" output
    for (const e of json.edges) {
      const link = diagram.findLinkForKey(e.id);
      const edge = this.network.findEdge(link);
      const pts = e.pos.split(" ");
      const ptList = new go.List();
      for (const ptStr of pts) {
        const {x, y} = this.parsePos(ptStr, h);
        ptList.add(new go.Point(x, y));
      }
      edge.pts = ptList;
    }

    // Update the "physical" positions of the nodes and links.
    this.updateParts();
    this.network = null;
  }

  /**
   * Parse a pos string into an x-y pair, normalizing to a top-left origin and pixels.
   * @param {*} str A Graphviz "pos" property string
   * @param {*} h The height, in points, of the Graphviz output graph
   * @returns An x, y pair representing a point
   */
  parsePos(str, h) {
    const idx = str.indexOf(",");
    const x = parseFloat(str.substring(0, idx)) * 96 / 72;
    const y = (h - parseFloat(str.substring(idx + 1)) + 1) * 96 / 72;
    return { x, y };
  }
}

/**
 * DotEdge, a LayoutEdge that holds additional info about link points.
 */
class DotEdge extends go.LayoutEdge {
  constructor(network) {
    super(network);
    this.pts = null;
  }

  commit() {
    this.link.points = this.pts;
  }
}
