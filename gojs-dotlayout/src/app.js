"use strict";
/*
*  Copyright (C) 1998-2022 by Northwoods Software Corporation. All Rights Reserved.
*/

import * as go from 'gojs';
import { DotLayout } from './DotLayout';
import { Graphviz } from '@hpcc-js/wasm/graphviz';

export const init = async () => {
  // Because Graphviz is provided as WASM, it must be asynchronously loaded.
  // We do this before creating the diagram to ensure it's available for the initial layout.
  const graphviz = await Graphviz.load();

  const $ = go.GraphObject.make;

  const myDiagram = $(go.Diagram, 'myDiagramDiv'); // create a Diagram for the DIV HTML element

  const layout = new DotLayout(graphviz);  // defined in DotLayout.js
  myDiagram.layout = layout;

  // a couple different sized node templates
  myDiagram.nodeTemplate =
    $(go.Node, go.Panel.Spot,
      $(go.Shape, { fill: 'white', width: 75, height: 25 },
        new go.Binding('fill', 'color')),
      $(go.TextBlock, { margin: 4 },
        new go.Binding('text', 'key')));

  myDiagram.nodeTemplateMap.add("wide",
    $(go.Node, go.Panel.Spot,
      $(go.Shape, { fill: 'white', width: 175, height: 25 },
        new go.Binding('fill', 'color')),
      $(go.TextBlock, { margin: 4 },
        new go.Binding('text', 'key'))));

  // use bezier links since Graphviz outputs bezier control points
  myDiagram.linkTemplate =
    $(go.Link, { curve: go.Link.Bezier },
      $(go.Shape),
      $(go.Shape, { toArrow: "Standard" })
    );

  const nodeArray = [];
  let i;
  for (i = 0; i < 50; i++) {
    nodeArray.push({ key: `n${i}`, category: Math.random() < .33 ? "wide" : "" });
  }

  // randomize the node data
  for (i = 0; i < nodeArray.length; i++) {
    const swap = Math.floor(Math.random() * nodeArray.length);
    let temp = nodeArray[swap];
    nodeArray[swap] = nodeArray[i];
    nodeArray[i] = temp;
  }

  const linkArray = [];
  for (i = 0; i < nodeArray.length - 1; i++) {
    const from = nodeArray[i].key;
    const numto = Math.floor(1 + (Math.random() * 3) / 2);
    for (let j = 0; j < numto; j++) {
      let idx = Math.floor(i + 5 + Math.random() * 10);
      if (idx >= nodeArray.length) idx = i + (Math.random() * (nodeArray.length - i)) | 0;
      const to = nodeArray[idx].key;
      // make sure links include a key so we can quickly find them via Diagram.findLinkForKey to set their points
      linkArray.push({ key: i, from, to});
    }
  }

  myDiagram.model = new go.GraphLinksModel({
    linkKeyProperty: "key",
    nodeDataArray: nodeArray,
    linkDataArray: linkArray
  });

  window.myDiagram = myDiagram;
};

window.addEventListener('DOMContentLoaded', init);