"use strict";
/*
*  Copyright (C) 1998-2022 by Northwoods Software Corporation. All Rights Reserved.
*/

// A custom Layout that lays out nodes and links via a Graphviz dot layout

/*
* This is not part of the main GoJS library.
* Note that the API for this class may change with any version, even point releases.
* If you intend to use this project in production, you should copy the code to your own source directory.
*/

import * as go from 'gojs';

/**
 * A custom {@link Layout} lays out nodes and links via a Graphviz dot layout: https://graphviz.org/docs/layouts/dot/.
 *
 * This layout does not currently support Groups or ports.
 */
export class DotLayout extends go.Layout {
  /**
   * Constructs a DotLayout.
   * 
   * A loaded Graphviz instance must be passed to this constructor to ensure the library is loaded prior to any layout occurring.
   * @param {*} graphviz A loaded Graphviz instance.
   */
  constructor(graphviz) {
    if (!graphviz) throw new Error(`no Graphviz instance was provided to DotLayout`);
    const proto = Object.getPrototypeOf(graphviz);
    if (!(proto && typeof proto.dot === 'function')) throw new Error(`provided Graphviz instance must include dot layout function`);

    super();
    this.isRouting = true;

    this._graphviz = graphviz;

    this._direction = 'TB';
    this._layerSpacing = 25;
    this._nodeSpacing = 25;
    this._usesLinkSpots = false;
    this._iterations = NaN;
  }

  /**
   * Gets or sets the direction for the graph.
   * 
   * Valid values are "LR", "TB", "RL", "BT". Defaults to "TB".
   * 
   * This corresponds to the dot layout rankdir attribute: https://graphviz.org/docs/attrs/rankdir/.
   */
  get direction() { return this._direction; }
  set direction(value) {
    if (!(value === 'LR' || value === 'TB' || value === 'RL' || value === 'BT')) throw new Error(`new value for DotLayout.direction must be "LR", "TB", "RL", or "BT", not: ${value}`);
    if (this._direction !== value) {
      this._direction = value;
      this.invalidateLayout();
    }
  }

  /**
   * Gets or sets the space between layers. This value is in pixels and will be converted for input to dot.
   * 
   * This value must be greater than 1.92 (to correspond to dot's minimum). Defaults to 25.
   * 
   * This corresponds to the dot layout ranksep attribute: https://graphviz.org/docs/attrs/ranksep/.
   */
  get layerSpacing() { return this._layerSpacing; }
  set layerSpacing(value) {
    if (typeof value !== 'number' || value < 1.92) throw new Error(`new value for DotLayout.layerSpacing must be a number >= 1.92, not: ${value}`);
    if (this._layerSpacing !== value) {
      this._layerSpacing = value;
      this.invalidateLayout();
    }
  }

  /**
   * Gets or sets the space between nodes within a layer. This value is in pixels and will be converted for input to dot.
   * Note that setting this value does not guarantee each node in a layer will be separated by the value.
   * The layout will also determine a node's layer position with other nodes and layers taken into account.
   * 
   * This value must be greater than 1.92 (to correspond to dot's minimum). Defaults to 25.
   * 
   * This corresponds to the dot layout nodesep attribute: https://graphviz.org/docs/attrs/nodesep/.
   */
  get nodeSpacing() { return this._nodeSpacing; }
  set nodeSpacing(value) {
    if (typeof value !== 'number' || value < 1.92) throw new Error(`new value for DotLayout.nodeSpacing must be a number >= 1.92, not: ${value}`);
    if (this._nodeSpacing !== value) {
      this._nodeSpacing = value;
      this.invalidateLayout();
    }
  }

  /**
   * Gets or sets whether the fromSpot and toSpot of each link should be used by the layout when routing links.
   * Link routes are typically more readable when this is left as false.
   * 
   * Defaults to false.
   * 
   * This corresponds to the Graphviz edge headport/tailport attributes:
   * https://graphviz.org/docs/attrs/headport/
   * https://graphviz.org/docs/attrs/tailport/
   */
   get usesLinkSpots() { return this._usesLinkSpots; }
   set usesLinkSpots(value) {
     if (typeof value !== 'boolean') throw new Error(`new value for DotLayout.usesLinkSpots must be a boolean, not: ${value}`);
     if (this._usesLinkSpots !== value) {
       this._usesLinkSpots = value;
       this.invalidateLayout();
     }
   }

  /**
   * Gets or sets the number of iterations for the dot layout's network simplex applications.
   * 
   * This value must be positive. Defaults to NaN, meaning no limit.
   * 
   * This corresponds to the dot layout nslimit attribute: https://graphviz.org/docs/attrs/nslimit/.
   */
  get iterations() { return this._iterations; }
  set iterations(value) {
    if (typeof value !== 'number' || value <= 0) throw new Error(`new value for DotLayout.iterations must be a positive number, not: ${value}`);
    if (this._iterations !== value) {
      this._iterations = value;
      this.invalidateLayout();
    }
  }

  /**
   * Creates a copy of this Layout and returns it.
   * @returns A copied DotLayout
   */
  copy() {
    const copy = new (this.constructor)(this._graphviz);
    this.cloneProtected(copy);
    return copy;
  }

  /**
   * Copies properties to a cloned Layout.
   */
  cloneProtected(copy) {
    super.cloneProtected(copy);
    // don't copy .root
    copy._direction = this._direction;
    copy._layerSpacing = this._layerSpacing;
    copy._nodeSpacing = this._nodeSpacing;
    copy._usesLinkSpots = this._usesLinkSpots;
    copy._iterations = this._iterations;
  }

  /**
   * Use a LayoutNetwork that always creates DotEdges.
   */
  createNetwork() {
    const net = new go.LayoutNetwork(this);
    net.createVertex = () => new DotVertex(net);
    net.createEdge = () => new DotEdge(net);
    return net;
  }

  /**
   * This method actually positions all of the Nodes and Links.
   * @param {*} coll A Diagram, Group, or collection of {@link Part}s.
   */
  doLayout(coll) {
    const diagram = this.diagram;
    if (!diagram) throw new Error('No diagram available in DotLayout.doLayout.');

    if (this.network === null) {
      this.network = this.makeNetwork(coll);
    }
    if (this.network.vertexes.count === 0) {
      this.network = null;
      return;
    }

    this.arrangementOrigin = this.initialOrigin(this.arrangementOrigin);

    // generate DOT language graph: https://graphviz.org/doc/info/lang.html
    const dot = this.generateDot();

    // perform Graphviz dot layout via Graphviz WASM
    const jsonStr = this._graphviz.dot(dot, 'json0');
    const json = JSON.parse(jsonStr);

    const h = parseFloat(json.bb.substring(json.bb.lastIndexOf(',') + 1));  // save height so we can convert y values
    // set vertex points based on "objects" output
    for (const n of json.objects) {  // nodes
      const node = diagram.findNodeForKey(n.name);
      const vertex = this.network.findVertex(node);
      const { x, y } = this.parsePos(n.pos, h);
      vertex.centerX = x;
      vertex.centerY = y;
    }
    // set link points based on "edges" output
    if (this.isRouting) {
      for (const e of json.edges) {
        const link = diagram.findLinkForKey(e.id);
        const edge = this.network.findEdge(link);
        const pts = e.pos.split(' ');
        const ptList = new go.List();
        for (const ptStr of pts) {
          const {x, y} = this.parsePos(ptStr, h);
          ptList.add(new go.Point(x, y));
        }
        edge._pts = ptList;
      }
    }

    // Update the "physical" positions of the nodes and links.
    this.updateParts();
    this.network = null;
  }

  /**
   * This method is responsible for generating the input for the dot layout. See https://graphviz.org/doc/info/lang.html.
   * 
   * The default implementation accounts for node sizes and uses no arrowheads to ensure proper link points are output.
   * 
   * This method can be overridden, but we recommend incorporating parts of the default implementation.
   * @returns A DOT Language string representing the input to the Graphviz dot layout
   */
  generateDot() {
    const nslimit = !isNaN(this.iterations) ? `nslimit=${this.iterations}` : '';
    const nodesep = this.nodeSpacing / 96;
    const ranksep = this.layerSpacing / 96;

    let dot = `digraph {
  rankdir="${this.direction}"
  ranksep=${ranksep}
  nodesep=${nodesep}
  ${nslimit}
  node [shape="box" fixedsize=true]
  edge [arrowhead="none"]\n`;
    const vit = this.network.vertexes.iterator;
    while (vit.next()) {
        const v = vit.value;
        const node = v.node;
        if (!node) continue;
        if (node instanceof go.Group) throw new Error('DotLayout does not currently support Groups.');
        this.assignVertexProperties(v);
        // prepare DOT language attributes for non-default vertex properties
        const width = !isNaN(v.width) ? `width=${v.width / 96}` : '';
        const height = !isNaN(v.height) ? ` height=${v.height / 96}` : '';
        const shape = v.shape !== 'box' ? ` shape="${v.shape}"` : '';
        // divide size by 96 since Graphviz expects inches
        dot += `  ${node.key} [${width}${height}${shape}]\n`;
    }
    const eit = this.network.edges.iterator;
    while (eit.next()) {
        const e = eit.value;
        const link = e.link;
        if (!link) continue;
        const fromNode = link.fromNode;
        const toNode = link.toNode;
        if (!(fromNode && toNode)) continue;
        this.assignEdgeProperties(e);
        // prepare DOT language attributes for non-default edge properties
        const constraint = !e.isConstraint ? ' constraint=false' : '';
        const tailport = e.tailport !== 'c' ? ` tailport=${e.tailport}` : '';
        const headport = e.headport !== 'c' ? ` headport=${e.headport}` : '';
        const weight = e.weight !== 1 ? ` weight=${e.weight}` : '';
        // include the Link key as an ID for quick lookup from the output
        dot += `  ${fromNode.key} -> ${toNode.key} [id=${link.key}${constraint}${tailport}${headport}${weight}]\n`;
    }
    dot += '}';
    return dot;
  }

  /**
   * Override this method in order to set vertex properties prior to the dot layout being performed.
   * 
   * By default, this method does nothing.
   * @param {*} v The vertex for which properties can be assigned
   */
  assignVertexProperties(v) { }

  /**
   * Override this method in order to set edge properties prior to the dot layout being performed.
   * 
   * By default, this method sets the headport and tailport properties if usesLinkSpots is true.
   * @param {*} e The edge for which properties can be assigned
   */
  assignEdgeProperties(e) {
    if (this.usesLinkSpots) {
      e.tailport = this.getPortAttr(e.link.fromSpot, true);
      e.headport = this.getPortAttr(e.link.toSpot, false);
    }
  }

  /**
   * Take a link's from or toSpot and convert to a compass point for dot.
   * 
   * Not all GoJS spots correspond to DOT compass points, particularly ...Sides spots.
   * @param {*} spot The from or toSpot of the given link
   * @param {*} isfrom Whether this is a from spot (tailport)
   * @returns A compass_point for an edge, https://www.graphviz.org/docs/attr-types/portPos/
   */
  getPortAttr(spot, isfrom) {
    let port = 'c';
    switch (spot) {
      case go.Spot.Top:
      case go.Spot.TopCenter:
      case go.Spot.TopSide: port = 'n'; break;  // north, top
      case go.Spot.TopRight: port = 'ne'; break;  // northeast, top-right
      case go.Spot.Right:
      case go.Spot.RightCenter:
      case go.Spot.RightSide: port = 'e'; break;  // east, right
      case go.Spot.BottomRight: port = 'se'; break;  // southeast, bottom-right
      case go.Spot.Bottom:
      case go.Spot.BottomCenter:
      case go.Spot.BottomSide: port = 's'; break;  // south, bottom
      case go.Spot.BottomLeft: port = 'sw'; break;  // southwest, bottom-left
      case go.Spot.Left:
      case go.Spot.LeftCenter:
      case go.Spot.LeftSide: port = 'w'; break;  // west, left
      case go.Spot.TopLeft: port = 'nw'; break;  // northwest, top-left
      case go.Spot.Center:
      case go.Spot.Default: port = 'c'; break;
      default: port = '_'; break;
    }
    return port;
  }

  /**
   * Parse a pos string into an x-y pair, normalizing to a top-left origin and pixels.
   * @param {*} str A Graphviz "pos" property string
   * @param {*} h The height, in points, of the Graphviz output graph
   * @returns An x, y pair representing a point
   */
  parsePos(str, h) {
    const idx = str.indexOf(',');
    const x = parseFloat(str.substring(0, idx)) * 96 / 72;
    const y = (h - parseFloat(str.substring(idx + 1)) + 1) * 96 / 72;
    return { x, y };
  }
}

/**
 * DotVertex, a LayoutVertex that holds additional info specific to dot layouts.
 */
class DotVertex extends go.LayoutVertex {
  constructor(network) {
    super(network);

    // default to NaN so we can ensure they're set
    this.width = NaN;
    this.height = NaN;

    this._shape = 'box';
  }

  /**
   * Gets or sets the shape of this vertex.
   * 
   * Valid values can be found here: https://graphviz.org/doc/info/shapes.html#polygon. Defaults to "box".
   * 
   * This property can be set during assignVertexProperties.
   * 
   * This corresponds to the Graphviz node shape attribute: https://graphviz.org/docs/attrs/shape/.
   */
  get shape() { return this._shape; }
  set shape(value) {
    if (this._shape !== value) {
      this._shape = value;
    }
  }
}

/**
 * DotEdge, a LayoutEdge that holds additional info specific to dot layouts.
 */
class DotEdge extends go.LayoutEdge {
  static validPorts = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'c', '_'];

  constructor(network) {
    super(network);
    this._pts = null;  // internal

    this._isConstraint = true;
    this._headport = 'c';
    this._tailport = 'c';
    this._weight = 1;
  }

  /**
   * Gets or sets whether this edge is used in determining node layers.
   * 
   * Defaults to true.
   * 
   * This property can be set during assignEdgeProperties.
   * 
   * This corresponds to the Graphviz edge constraint attribute: https://www.graphviz.org/docs/attrs/constraint/.
   */
  get isConstraint() { return this._isConstraint; }
  set isConstraint(value) {
    if (typeof value !== 'boolean') throw new Error(`new value for DotEdge.isConstraint must be a boolean, not: ${value}`);
    if (this._isConstraint !== value) {
      this._isConstraint = value;
    }
  }

  /**
   * Gets or sets the "compass point" where this edge connects to its to vertex.
   * 
   * Valid values are "n", "ne", "e", "se", "s", "sw", "w", "nw", "c", "_". Defaults to "c".
   * 
   * This property can be set during assignEdgeProperties.
   * 
   * This corresponds to the Graphviz edge headport attribute: https://graphviz.org/docs/attrs/headport/.
   */
  get headport() { return this._headport; }
  set headport(value) {
    if (!DotEdge.validPorts.includes(value)) throw new Error(`invalid value for DotEdge.headport: ${value}`);
    if (this._headport !== value) {
      this._headport = value;
    }
  }

  /**
   * Gets or sets the "compass point" where this edge connects to its from vertex.
   * 
   * Valid values are "n", "ne", "e", "se", "s", "sw", "w", "nw", "c", "_". Defaults to "c".
   * 
   * This property can be set during assignEdgeProperties.
   * 
   * This corresponds to the Graphviz edge tailport attribute: https://graphviz.org/docs/attrs/tailport/.
   */
  get tailport() { return this._tailport; }
  set tailport(value) {
    if (!DotEdge.validPorts.includes(value)) throw new Error(`invalid value for DotEdge.tailport: ${value}`);
    if (this._tailport !== value) {
      this._tailport = value;
    }
  }

  /**
   * Gets or sets the weight of this edge.
   * 
   * This value must be an integer >= 0. Defaults to 1.
   * 
   * This property can be set during assignEdgeProperties.
   * 
   * This corresponds to the Graphviz edge constraint attribute: https://graphviz.org/docs/attrs/weight/.
   */
  get weight() { return this._weight; }
  set weight(value) {
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) throw new Error(`new value for DotEdge.weight must be an integer >= 0, not: ${value}`);
    if (this._weight !== value) {
      this._weight = value;
    }
  }

  commit() {
    if (this.network.layout.isRouting) this.link.points = this._pts;
  }
}
