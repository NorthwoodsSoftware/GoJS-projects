<!--
  This component manages the diagram and how it is constructed based on changes to the data
-->

<script lang="ts">
  import go from 'gojs';

  import { onDestroy, onMount } from 'svelte';
  import DiagramOverlay from './DiagramOverlay.svelte';

  import type { KeyArray, NodeData, PairLike } from '$lib/types';
  import { DataManager, Pair, PairList } from '$lib/dataManager.svelte';
  import { currentTheme } from '$lib/stores';
  import { getType, avg } from '$lib/utils';
  import { typeColorMap } from '$lib/constants';
  import type { Unsubscriber } from 'svelte/store';

  interface Props {
    dataManager: DataManager;
    selectionChangedListener: // gets called when the JSONInfo detects cursor position change
    (keys: KeyArray) => void;
    openModal: Function; // opens the object editor modal
    closeModal: Function; // gets called when the modal is closed
    saveDiagramAs: Function; // save the diagram as file format. Used in the top bar for file>save as
  }

  let {
    dataManager = $bindable(),
    selectionChangedListener = $bindable(),
    openModal,
    closeModal = $bindable(),
    saveDiagramAs = $bindable()
  }: Props = $props();

  let diagramDiv: HTMLDivElement;

  // this is a state rune to update the DiagramOverlay component after the custom font loads
  let diagram: go.Diagram;

  let diagramResolve: Function;
  const diagramPromise = new Promise<go.Diagram>((res, rej) => {
    diagramResolve = res;
  });

  let root: go.Node; // this is the node representing the root data object
  let selectedKeys: KeyArray | null = null;

  // keep track of subscriptions to remove them when this component is destroyed
  let themeUnsub: Unsubscriber;
  let dataUnsub: Unsubscriber;

  const font = 'normal 350 16pt "Inconsolata", monospace';

  const maxStringLen = 24;
  const spacingAbove = 5.5;
  const spacingBelow = 2;

  const shadowBlur = 12;
  const nodeRadius = 3;
  const strokeWidth = 1.5;

  const generateKey = function (this: { lastKey: number }) {
    return `${this.lastKey++}`;
  }.bind({ lastKey: 0 });

  function addLink(port: go.GraphObject, node: go.Node) {
    const fromNode = port.part;
    if (!(fromNode instanceof go.Node)) throw new Error('port must be inside a go.Node');
    (diagram.model as go.GraphLinksModel).addLinkData({
      fromPort: port.portId,
      from: fromNode.key,
      to: node.key
    });
  }

  function makeExpandButton(portId: string | null = null) {
    let expandButton: go.Panel = go.GraphObject.build('Button', {
      name: 'expandButton',
      width: 15,
      height: 15,
      column: 2,
      margin: new go.Margin(0, 0, 0, 5),
      click: (e: go.InputEvent, button: go.GraphObject) => {
        if (!(button instanceof go.Panel)) throw new Error('Expected button to be a panel');

        const node = button.part;
        if (!(node instanceof go.Node)) throw new Error('button must be inside a go.Node');
        if (!node) return;

        const dia = node.diagram;
        if (!dia) return;

        const isExpanded = (button as any)['_isExpanded'];
        let pid: string = (button as any)['_targetPortId'];

        let rowPanel: go.Part | go.Panel | go.GraphObject = button;
        while (rowPanel.portId == null && rowPanel.panel && rowPanel !== rowPanel.panel)
          rowPanel = rowPanel.panel;

        if (rowPanel.portId == null) throw new Error('expand button could not find target port');
        if (!(rowPanel instanceof go.Panel)) throw new Error('expected port to be a panel');
        if (pid == null) pid = rowPanel.portId;

        const collT = new Set<go.Link | go.Node>(node.findLinksOutOf(pid)); // total coll
        const collC = collT.union(new Set()); // current stack/queue
        while (collC.size) {
          const ele = collC.values().next().value;
          if (!ele) break;
          collC.delete(ele);
          if (ele instanceof go.Link) {
            if (ele.toNode) {
              collC.add(ele.toNode);
              collT.add(ele.toNode);
            }
          } else if (ele instanceof go.Node) {
            ele.findLinksOutOf().each(l => {
              // don't expand collapsed trees
              if (((l.fromPort as go.Panel).findObject('expandButton') as any)['_isExpanded']) {
                collC.add(l);
                collT.add(l);
              }
            });
          }
        }

        const reason = isExpanded ? 'TreeCollapse' : 'TreeExpand';

        dia.commit(() => {
          collT.forEach(button => (button.visible = !isExpanded), null);

          const shape = button.findObject('buttonIcon') as go.Shape;
          dia.model.set(button, '_isExpanded', !isExpanded);
          dia.model.set(shape, 'figure', isExpanded ? 'PlusLine' : 'MinusLine');
        }, reason);
      }
    })
      .attach({
        // add custom properties to this panel
        _isExpanded: true,
        _buttonFillOver: 'gray',
        _targetPortId: portId
      })
      .theme('_buttonFillOver', 'buttonHover')
      .add(
        new go.Shape('MinusLine', {
          name: 'buttonIcon',
          strokeWidth: 0.75
        })
      );

    (expandButton.findObject('ButtonBorder') as go.Shape).strokeWidth = 0;
    (expandButton.findObject('ButtonBorder') as go.Shape).theme('fill', 'buttonFill');

    return expandButton;
  }

  function getHueRange(port: go.GraphObject | undefined, pairList: PairList) {
    let hueRange = [0, 360];
    if (port?.part?.data) {
      const prevNode = port.part as go.Node;
      const prevNodeData = prevNode.data as NodeData;
      hueRange = prevNodeData.hueRange;

      let siblingCount = 0;
      let idx = 0;
      prevNodeData.props.forEach((p, i) => {
        if (!(p.value instanceof PairList)) return;

        if (p.value === pairList) idx = siblingCount;
        siblingCount++;
      });

      const lower = ((hueRange[1] - hueRange[0]) / siblingCount) * idx + hueRange[0];
      const upper = ((hueRange[1] - hueRange[0]) / siblingCount) * (idx + 1) + hueRange[0];
      hueRange = [lower, upper];
    }

    return hueRange;
  }

  function traverseObject(
    pairList: PairList,
    port?: go.GraphObject,
    lastKeys: KeyArray = [],
    skipHue: boolean = false
  ) {
    const keyStrings: string[] = lastKeys.filter(v => typeof v === 'string');
    const lastKey = keyStrings?.[keyStrings.length - 1] ?? null;

    const props: PairLike[] = []; // this is needed to avoid passing a svelte proxy object into GoJS bindings
    const linkedProps: PairLike[] = []; // list of props that are ports

    pairList.forEach(pair => {
      // create a much simpler object for model data. Actual Pairs maintain a relation with the
      // parent list that we don't want here
      const p = {
        key: pair.key,
        value: pair.value
      };

      props.push(p);

      if (pair.value instanceof PairList) {
        linkedProps.push(p);
      }
    });

    let hueRange = getHueRange(port, pairList);

    const lastLabel = lastKey ?? port?.part?.data.label;

    const key = generateKey();
    diagram.model.addNodeData({
      isArray: pairList.isArray,
      key: key,
      hueRange: hueRange,
      label:
        typeof lastKeys.at(-1) === 'number'
          ? `${lastLabel} [${lastKeys.at(-1)}]`
          : (lastLabel ?? 'Root'),
      props: props
    });

    const node = diagram.findNodeForKey(key);
    if (!node) throw new Error(`Node not found after model.addNodeData(): ${key}`);

    if (port) {
      addLink(port, node);
    } else {
      root = node;
    }

    linkedProps.forEach((entry, idx) => {
      const subPort = node.findPort(entry.key + '');
      if (!subPort) throw new Error(`Could not find port after creation: ${entry.key}`);

      traverseObject(entry.value as PairList, subPort, [...lastKeys, entry.key], skipHue);
    });

    return node;
  }

  /**
   * Find a node for the given key list/path
   * @param keys list of keys to use to find the node
   * @param isKeysExact if true then error when the full key path is not valid,
   * if false then return the current node when no more links can be found
   */
  function findNodeForKeys(
    keys: KeyArray,
    isKeysExact: boolean = false,
    startingNode?: go.Node
  ): go.Node | null {
    let node = startingNode ?? root;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]; // portId

      const links = node.findLinksOutOf(k + '');
      if (links.count === 0) {
        return isKeysExact ? null : node;
      }

      const nextNode = links.first()!.toNode;
      if (!nextNode) return null;
      node = nextNode;
    }

    return node;
  }

  /**
   * Delete the node and all the nodes below it in the tree. If a port is passed in
   * then only delete the nodes connected to the port
   */
  function deleteNodes(node: go.Node, downPort?: string) {
    // remove down the links if there were any
    const oldLinks = node.findLinksOutOf(downPort);
    if (oldLinks.count) {
      const nodesToDelete: go.Node[] = [];
      let idx = 0;

      oldLinks.each(l => {
        if (l.toNode) nodesToDelete.push(l.toNode);
      });

      while (idx < nodesToDelete.length) {
        const n = nodesToDelete[idx++];
        const links = n.findLinksOutOf();

        links.each(l => {
          if (l.toNode) nodesToDelete.push(l.toNode);
        });
      }

      nodesToDelete.forEach(n => {
        diagram.remove(n);
      });
    }

    if (downPort === undefined) {
      diagram.remove(node);
    }
  }

  function updateHueRanges(node: go.Node) {
    const links = node.findLinksOutOf();
    if (links.count === 0) return;

    const totalHues = (node.data as NodeData).hueRange;
    let idx = 0;
    links.each(l => {
      const lower = ((totalHues[1] - totalHues[0]) / links.count) * idx + totalHues[0];
      const upper = ((totalHues[1] - totalHues[0]) / links.count) * (idx + 1) + totalHues[0];
      const hueRange = [lower, upper];

      const nextNode = l.toNode;
      if (!nextNode) throw new Error(`couldn't find the end of link index: ${idx}`);

      diagram.model.set(nextNode.data, 'hueRange', hueRange);
      updateHueRanges(nextNode);

      idx++;
    });
  }

  // return true if successful, return false if a full rebuild is needed
  function tryPartialBuild(
    oldPairs: PairList,
    newPairs: PairList,
    lastKeys: KeyArray = []
  ): boolean {
    let isSuccessful = false;

    diagram.model.commit(m => {
      const node = findNodeForKeys(lastKeys, true);
      if (!node) throw new Error(`Couldn't find node`);
      const nodeData = node.data as NodeData;

      // check if this node has changed in a way that the recursive function won't see
      if (nodeData.isArray !== newPairs.isArray) {
        m.set(nodeData, 'isArray', newPairs.isArray);
      }

      // go backwards and update the item array index this is linked from
      const link = node.findLinksInto().first();
      const prevNode = link?.fromNode;
      if (link && prevNode) {
        const port = link.fromPort as go.Panel;
        const index = port?.itemIndex;

        m.set((prevNode.data as NodeData).props[index], 'value', newPairs);
      }

      _tryPartialBuild(oldPairs, newPairs, node);

      // update all hue ranges recursively
      updateHueRanges(node);
    }, null); // null as second arg to skip undo manager

    return isSuccessful;
  }

  function _insertItem(node: go.Node, index: number, item: Pair) {
    const p: PairLike = {
      key: item.key,
      value: item.value
    };
    diagram.model.insertArrayItem(node.data.props, index, p);

    if (item.value instanceof PairList) {
      const key = item.key;
      const port = node.findPort(key + '');
      // if no port can be found findPort() will return the whole node
      if (port && port !== node) {
        traverseObject(item.value, port, [key], true); // true to skip hue update since we need to update them all at the end
      }
    }
  }

  function _removeItem(node: go.Node, index: number, key: string) {
    deleteNodes(node, key + '');
    diagram.model.removeArrayItem(node.data.props, index);
  }

  /**
   *
   * @param oldPairs
   * @param newPairs
   * @param lastNode
   * @returns boolean true if the pairs were equal, false otherwise
   */
  function _tryPartialBuild(oldPairs: PairList, newPairs: PairList, node: go.Node) {
    let oldI = 0;
    let newI = 0;

    // we must add all the links after constructing the node is finished. Otherwise issues can arise
    // when portIDs are temporarily not always unique
    const nodesToLink: { toNode: go.Node; fromNode: go.Node; portID: string }[] = [];

    const nodeData = node.data as NodeData;

    while (oldI < oldPairs.length && newI < newPairs.length) {
      const oldP = oldPairs.findPairByIndex(oldI);
      const newP = newPairs.findPairByIndex(newI);

      if (!oldP) throw new Error(`Couldn't find oldPair[${oldPairs.length}] for index: ${oldI}`);
      if (!newP) throw new Error(`Couldn't find newPair[${newPairs.length}] for index: ${newI}`);

      if (oldP && newP && oldP.equals(newP)) {
        oldI++;
        newI++;
        continue;
      }

      if (oldP?.value instanceof PairList) {
        if (newP?.value instanceof PairList) {
          // if both pair lists then go deeper

          // we could swap objects around here such that this newP is given the modeldata and
          // the pre-existing node which is closest (without going over) to the number of object
          // children required. This way we minimize the creation of new go.Nodes
          // Or futher instead of deleting unused Nodes they could be hidden and reused later.
          // For simplicity this just absorbs the next available node

          const nextNode = findNodeForKeys([oldP.key], true, node);
          if (!nextNode) throw new Error(`Couldn't find next node under key: ${oldP.key}`);
          const nextNodeData = nextNode.data as NodeData;

          if (nextNodeData.isArray !== newP.value.isArray) {
            // update next node
            diagram.model.set(nextNodeData, 'isArray', newP.value.isArray);
          }

          // update label
          if (nodeData.isArray)
            diagram.model.set(nextNodeData, 'label', `${nodeData.label} [${newI}]`);
          else diagram.model.set(nextNodeData, 'label', `${newP.key}`);

          diagram.model.set(nodeData.props[newI], 'value', newP.value);
          _tryPartialBuild(oldP.value, newP.value, nextNode);

          if (oldP.key !== newP.key) {
            // we must make sure that no keys ever collide, if they do then it may break the ports in some cases
            for (let i = newI + 1; i < Math.min(newPairs.length, nodeData.props.length); i++) {
              if (nodeData.props[i].key === newP.key) {
                // found a collision

                // find a unique key to set this to temporarily
                let tempKey = -1;
                while (oldPairs.has(tempKey, false) || newPairs.has(tempKey, false)) tempKey--;
                diagram.model.set(nodeData.props[i], 'key', tempKey + '');

                break; // only one collision is ever possible so stop searching
              }
            }

            diagram.model.set(nodeData.props[newI], 'key', newP.key);

            // when the key changes, the portID changes too. update the fromPort on the link
            const link = nextNode.findLinksInto().first();
            if (!link) throw new Error(`Couldn't find link for updated PID: ${newP.key}`);
            if (!link.toNode)
              throw new Error(`Couldn't find toNode for link for updated PID: ${newP.key}`);
            if (!link.fromNode)
              throw new Error(`Couldn't find fromNode for link for updated PID: ${newP.key}`);

            // save the information for later so we can form links after portIDs stop changing
            nodesToLink.push({
              toNode: link.toNode,
              fromNode: link.fromNode,
              portID: newP.key + ''
            });

            diagram.remove(link);
          }
        } else {
          // insert until we get to an obj again
          _insertItem(node, newI, newP);

          newI++;
          continue;
        }
      } else {
        if (newP?.value instanceof PairList) {
          // delete things until new and old are both PairList

          _removeItem(node, newI, oldP.key + '');

          oldI++;
          continue;
        } else {
          // modify current array item as needed

          if (nodeData.props[newI].value !== newP.value)
            diagram.model.set(nodeData.props[newI], 'value', newP.value);
          if (nodeData.props[newI].key !== newP.key)
            diagram.model.set(nodeData.props[newI], 'key', newP.key);
        }
      }

      if (oldI < oldPairs.length) oldI++;
      if (newI < newPairs.length) newI++;
    }

    while (oldI < oldPairs.length) {
      // delete what is left over
      const oldP = oldPairs.findPairByIndex(oldI);
      if (!oldP) throw new Error(`Couldn't find oldPair[${oldPairs.length}] for index: ${oldI}`);

      _removeItem(node, newI, oldP.key + '');
      oldI++;
    }

    while (newI < newPairs.length) {
      // insert what never got added
      const newP = newPairs.findPairByIndex(newI);
      if (!newP) throw new Error(`Couldn't find newPair[${newPairs.length}] for index: ${newI}`);

      _insertItem(node, newI, newP);
      newI++;
    }

    // link nodes now that keys are unique again
    nodesToLink.forEach(data => {
      if (data.fromNode.findPort(data.portID) === data.fromNode)
        console.warn(`couldn't find port: ${data.portID}`);
      (diagram.model as go.GraphLinksModel).addLinkData({
        fromPort: data.portID,
        from: data.fromNode.key,
        to: data.toNode.key
      });
    });

    // if the props count change from or to 0, then update props bindings
    // This rounds the header and removes the gray separator for empty objects/lists
    if ((oldPairs.length === 0) !== (newPairs.length === 0)) node.updateTargetBindings('props');
  }

  function setOutlineColor(node: go.Node, color: string | null) {
    if (color === null) {
      // since the default color is a CSS variable it can't be set with mode.set()
      node.updateTargetBindings('nodeStroke');
      return;
    }
    if (typeof color !== 'string')
      throw new Error(`Expected outline color to be a string. Got: ${color}`);

    const outlineShape = node.findObject('outlineShape');

    if (outlineShape) diagram.model.set(outlineShape, 'fill', color);
    else console.warn('shape for outline was not found');
  }

  const updateSelectionAdornments = function (this: {
    lastShape: go.GraphObject | go.Shape | null;
    lastNodes: Array<go.Node>;
  }) {
    const node = selectedKeys ? findNodeForKeys(selectedKeys.slice(0, -1), true) : undefined;
    const nodeData = node?.data as NodeData;

    // nextShape === null for all headers
    const nextShape = node?.findObject('bodyShape') as go.Shape | null;

    diagram.model.commit(m => {
      if (this.lastShape) {
        // since the default color is a CSS variable it can't be set with mode.set()
        this.lastShape.part?.updateTargetBindings('nodeFill');
      }

      this.lastNodes.forEach(n => {
        setOutlineColor(n, null);
      });
      this.lastNodes = [];

      if (node) {
        const color = `OKLCH(${diagram.themeManager.findValue('OKLCHtext', 'colors')} ${avg(nodeData.hueRange)})`;
        setOutlineColor(node, color);
        this.lastNodes.push(node);

        // if node is defined then so is selectedKeys, So we can assert not null
        // if property has object value then also highlight the node it points to
        if (node.findPort(selectedKeys!.at(-1) + '') && selectedKeys!.length) {
          const links = node.findLinksOutOf(selectedKeys!.at(-1) + '');
          const node2 = links.first()?.toNode;
          if (node2 && links.count === 1) {
            const color = `OKLCH(${diagram.themeManager.findValue('OKLCHtext', 'colors')} ${avg(node2.data.hueRange)})`;
            setOutlineColor(node2, color);
            this.lastNodes.push(node2);
          }
        }
      }

      if (nextShape && !(nextShape instanceof go.Shape))
        throw new Error('shape was found but was not an instance of go.Shape');

      this.lastShape = nextShape;

      if (node != null && nextShape != null) {
        // all the pairs in the node share one rounded bottom rectangle shape for the fill so we
        // must make a custom brush to highlight the desired row item

        const c1 = diagram.themeManager.findValue('nodeFill', 'colors');

        // what percentage of the shape height is one pixel. This lets us ensure that the brush
        // stops will always be hidden.
        const onePixel = 1 / nextShape.getDocumentBounds().height;

        const originalFill = diagram.themeManager.findValue('nodeFill', 'colors');
        const c2 =
          diagram.themeManager.currentTheme === 'light'
            ? go.Brush.darkenBy(originalFill, 0.15)
            : go.Brush.lightenBy(originalFill, 0.15);

        const len = node?.data?.props?.length ?? 1;
        const i = nodeData.props.findIndex((prop: any) => prop?.key === selectedKeys!.at(-1)) ?? 0;

        if (c1 && c2 && i < len && i >= 0) {
          const stops = {
            [i / len]: c2, // hide the stop underneath the table row separator
            [(i + 1) / len]: c2,

            start: go.Spot.Top,
            end: go.Spot.Bottom
          };

          //  if it isn't already at 0 or 1 then add a stop above/below the selected prop to
          // change it back to the original color for the rest of the row items
          if (i / len !== 0) stops[i / len - onePixel] = c1;
          if ((i + 1) / len !== 1) stops[(i + 1) / len + onePixel] = c1;

          m.set(nextShape, 'fill', new go.Brush('Linear', stops));
        }
      }
    }, null); // null as second arg to skip undo manager
  }.bind({
    lastShape: null,
    lastNodes: []
  });

  function buildDiagram(oldPairs?: PairList, newPairs?: PairList, keys?: KeyArray) {
    if (oldPairs && newPairs && keys && root) {
      tryPartialBuild(oldPairs, newPairs, keys);
    } else {
      diagram.commit(d => {
        d.removeParts(d.parts);
        d.removeParts(d.nodes);
      }, null); // null as second arg to skip undo manager

      diagram.model = new go.GraphLinksModel();
      (diagram.model as go.GraphLinksModel).linkFromPortIdProperty = 'fromPort';
      (diagram.model as go.GraphLinksModel).linkToPortIdProperty = 'toPort';
      diagram.model.modelData.shadowBlur = shadowBlur * diagram.scale;

      const listener = () => {
        diagram.commandHandler.zoomToFit();
        diagram.removeDiagramListener('LayoutCompleted', listener);
      };
      diagram.addDiagramListener('LayoutCompleted', listener);

      // dataManager.data will not be an up to date after the first build
      traverseObject(newPairs ?? dataManager.data);
    }
  }

  function findKeysForNode(node: go.Node): KeyArray {
    const keys: KeyArray = [];

    while (true) {
      const links = node.findLinksInto();
      const link = links.first();

      if (!link) break;
      const nextNode = link.fromNode;
      if (!nextNode) break;
      const pid = link.fromPortId;

      // check if it was an array
      if (nextNode.data?.isArray) keys.push(Number(pid));
      else keys.push(pid);

      node = nextNode;
    }

    return keys.reverse();
  }

  // this is called by "File > Save as ..." in the top menu bar
  saveDiagramAs = (format: 'png' | 'svg' | 'pdf') => {
    const oldSelection = selectedKeys;
    selectedKeys = null;
    updateSelectionAdornments();

    if (format === 'png') {
      const dia = diagram;
      const img = dia.makeImage({
        details: 1,
        type: 'image/png'
      });

      if (!img) return;
      const link = document.createElement('a');
      link.href = img.src!;
      link.download = 'mydata.png';
      link.click();

      URL.revokeObjectURL(link.href);
    } else if (format === 'svg') {
      const dia = diagram;
      const svg = dia.makeSvg({ scale: 1 });

      if (!svg) throw new Error(`couldn't convert to svg`);

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);

      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'mydata.svg';
      link.click();

      URL.revokeObjectURL(link.href);
    } else if (format === 'pdf') {
      const svgWindow = window.open();
      if (!svgWindow) return; // failure to open a new Window

      svgWindow.document.title = 'mydata';
      const bnds = diagram.documentBounds;

      const isLandscape = bnds.width / bnds.height > 1;
      const printSize = isLandscape ? new go.Size(960, 700) : new go.Size(700, 960);

      const style = svgWindow.document.createElement('style');
      style.textContent = `
        @page {
          size: ${isLandscape ? 'landscape' : 'portrait'};
          margin: 0px;
          padding: 0px;
        }
        body {
          margin: 0px;
          padding: 0px;
        }
        svg {
          margin: 20px;
          max-height: 100vh;
        }
      `;
      svgWindow.document.head.appendChild(style);

      const scaleX = printSize.width / bnds.width;
      const scaleY = printSize.height / bnds.height;
      const scale = Math.min(scaleX, scaleY);

      const svg = diagram.makeSvg({
        scale: scale,
        position: new go.Point(bnds.x, bnds.y),
        size: printSize,
        background: 'white'
      });

      if (!svg) return;
      svgWindow.document.body.appendChild(svg);
      requestAnimationFrame(() => {
        svgWindow.print();
        svgWindow.close();
      });
    }

    selectedKeys = oldSelection;
    updateSelectionAdornments();
  };

  onMount(() => {
    // go.Diagram.licenseKey = ...
    // this is an async to wait for the font before making the diagram
    (async () => {
      // load the font before we create the diagram
      await new Promise((res, rej) => {
        const timeout = setTimeout(() => rej(), 2000); // give up if it hasn't loaded after 2 seconds

        document.fonts.forEach(f => f.load());
        document.fonts.ready.then(() => {
          clearTimeout(timeout);
          res(null);
        });
      }).catch(err => console.warn(`couldn't load font`)); // don't error on reject

      diagram = new go.Diagram(diagramDiv, {
        'animationManager.isInitial': false, // disable initial loading animation
        'animationManager.isEnabled': true,
        'undoManager.isEnabled': true,
        scrollMode: go.ScrollMode.Infinite,

        // don't allow modifying the diagram
        allowClipboard: false,
        allowDelete: false,
        allowLink: false,

        layout: new go.TreeLayout({
          nodeSpacing: 15,
          angle: 0,
          setsPortSpot: false // don't change port spots when the diagram rotates
        })
      });

      (window as any).myDiagram = diagram; // For debugging purposes only
      diagramResolve(diagram); // resolve the promise for the diagram overlay

      // normally the shadow does not scale with the diagram
      let _lastScale = 0;
      diagram.addDiagramListener('ViewportBoundsChanged', e => {
        if (diagram.scale === _lastScale) return; // do nothing on no-op

        // model.commit() causes an immediate re-draw so it is better to skip the undo manager instead
        // It is also generally advised not to start any transaction inside of a diagram or model listener
        const oldSkips = diagram.skipsUndoManager;
        diagram.skipsUndoManager = true;

        const m = diagram.model;
        m.set(m.modelData, 'shadowBlur', shadowBlur * diagram.scale);
        diagram.skipsUndoManager = oldSkips;
      });

      const rowItemTemplate = new go.Panel('TableRow', {
        fromSpot: go.Spot.Right,
        fromLinkable: false,
        toLinkable: false
      })
        .bind('portId', '', (data: Pair) => {
          if (data.value !== null && typeof data.value === 'object') return data.key + '';
          else return null;
        })
        .add(
          new go.TextBlock('', {
            font: font,
            spacingAbove: spacingAbove,
            spacingBelow: spacingBelow,
            column: 0,
            alignment: go.Spot.Left,
            margin: new go.Margin(0, 0, 0, 4)
          })
            .themeData('stroke', '', null, (itemData, obj) => {
              const node = obj.part;
              return node.data?.isArray ? 'arrayTextColor' : 'textColor';
            })
            .bind('text', 'key', k => k + ':'),
          new go.Panel('Horizontal', {
            column: 1,
            alignment: go.Spot.Right,
            margin: new go.Margin(0, 4, 0, 10)
          }).add(
            new go.TextBlock('', {
              font: font,
              spacingAbove: spacingAbove,
              spacingBelow: spacingBelow
            })
              .themeData('stroke', '', null, itemData => {
                const v = itemData.value;
                const t = getType(v);
                return t;
              })
              .bind('text', 'value', (v: any) => {
                if (v !== null && typeof v === 'object') {
                  if (v?.isArray) {
                    return `[${v.length} item${v.length !== 1 ? 's' : ''}]`;
                  } else {
                    return `{${v.length} key${v.length !== 1 ? 's' : ''}}`;
                  }
                }

                if (typeof v === 'string') {
                  if (v.length > maxStringLen) {
                    return v.slice(0, maxStringLen - 3) + '...';
                  } else if (v.length === 0) return `""`;
                }

                return v + '';
              }),
            makeExpandButton().bind('visible', 'value', v => v !== null && typeof v === 'object')
          )
        );

      diagram.nodeTemplate = new go.Node('Auto', {
        selectionAdorned: false,
        shadowOffset: new go.Point(0, 0)
      })
        .theme('shadowColor', 'textColor')
        .bindModel('shadowBlur')
        .bindObject('isShadowed', 'isSelected')
        .add(
          // outline shape
          new go.Shape('RoundedRectangle', {
            name: 'outlineShape',
            strokeWidth: 0,
            // to make the roundedness of the outline match the roundedness of the contents the
            // strokeWidth must be taken into account here
            spot1: new go.Spot(0, 0, strokeWidth, strokeWidth),
            spot2: new go.Spot(1, 1, -strokeWidth, -strokeWidth),
            parameter1: nodeRadius + strokeWidth,
            shadowVisible: true
          }).theme('fill', 'nodeStroke'),
          // contains header and body
          new go.Panel('Vertical').add(
            // header
            new go.Panel('Auto', {
              stretch: go.Stretch.Horizontal,
              minSize: new go.Size(100, 0)
            }).add(
              new go.Shape('RoundedRectangle', {
                parameter1: nodeRadius,
                strokeWidth: 0,
                parameter2: 0b0011
              })
                .theme('fill', 'OKLCHbackground', 'colors', null, (LC, obj) => {
                  const data: NodeData = obj.part.data;
                  return `OKLCH(${LC} ${avg(data.hueRange)})`;
                })
                .bind('parameter2', 'props', p => {
                  return p.length !== 0 ? 0b0011 : 0b1111;
                }),
              new go.TextBlock('header', {
                font: font,
                spacingAbove: spacingAbove,
                spacingBelow: spacingBelow,
                margin: new go.Margin(0, 20, 0, 20)
              })
                .theme('stroke', 'OKLCHtext', 'colors', null, (LC, obj) => {
                  const data: NodeData = obj.part.data;
                  return `OKLCH(${LC} ${avg(data.hueRange)})`;
                })
                .bind('text', '', data => {
                  return data.isArray ? `[${data.label}]` : `{${data.label}}`;
                })
            ),
            // body
            new go.Shape('Rectangle', {
              strokeWidth: 0,
              height: strokeWidth * 2,
              stretch: go.Stretch.Horizontal,
              margin: new go.Margin(-0.01, 0, -0.01, 0)
            })
              .theme('fill', 'nodeStroke')
              .bind('visible', 'props', p => {
                return p.length !== 0;
              }),
            new go.Panel('Auto', {
              stretch: go.Stretch.Horizontal,
              margin: new go.Margin(-strokeWidth, 0, 0, 0)
            }).add(
              new go.Shape('RoundedRectangle', {
                name: 'bodyShape',
                parameter1: nodeRadius,
                strokeWidth: 0,
                parameter2: 0b1100,
                spot1: go.Spot.TopLeft,
                spot2: go.Spot.BottomRight
              }).theme('fill', 'nodeFill'),
              new go.Panel('Table', {
                itemTemplate: rowItemTemplate,
                stretch: go.Stretch.Horizontal,
                defaultRowSeparatorStrokeWidth: strokeWidth,
                name: 'propTable'
              })
                .theme('defaultRowSeparatorStroke', 'nodeStroke')
                .bind('itemArray', 'props')
            )
          )
        );

      diagram.linkTemplate = new go.Link({
        routing: go.Routing.AvoidsNodes,
        // corner: Infinity,
        corner: 4,
        curve: go.Curve.JumpGap,
        reshapable: false,
        resegmentable: false,
        relinkableFrom: false,
        relinkableTo: false,
        toShortLength: 0,
        fromShortLength: 2
      }).add(
        new go.Shape({
          stroke: 'lightgray',
          strokeWidth: 1.5
        }).theme('stroke', 'linkStroke'),
        new go.Shape({
          fill: 'lightgray',
          fromArrow: 'Triangle',
          stroke: null,
          strokeWidth: 0
        }).theme('fill', 'linkStroke')
      );

      diagram.themeManager.readsCssVariables = true;
      diagram.themeManager.changesDivBackground = true;

      // set light theme
      diagram.themeManager.set('light', {
        colors: {
          div: '#f5f6f2',
          textColor: 'black',
          arrayTextColor: 'var(--color-blue-600)',
          nodeFill: 'white',
          nodeStroke: 'lightgray',
          gridStroke: 'var(--color-stone-300)',
          linkStroke: 'rgb(150,150,150)',
          buttonFill: 'rgb(230,230,230)',
          buttonHover: 'rgb(215,215,215)',
          OKLCHbackground: '0.85 0.15', // set the lightness/chroma for the header background
          OKLCHtext: '0.4 0.15', // set the lightness/chroma for the header text
          ...typeColorMap // map of value types to css color variables
        }
      });

      // set dark theme
      diagram.themeManager.set('dark', {
        colors: {
          div: '#08090a',
          textColor: 'white',
          arrayTextColor: 'var(--color-blue-400)',
          nodeFill: '#1a1c1f',
          nodeStroke: 'var(--color-zinc-500)',
          gridStroke: 'var(--color-zinc-800)',
          linkStroke: 'var(--color-zinc-400)',
          buttonFill: 'rgb(190,190,190)',
          buttonHover: 'rgb(215,215,215)',
          OKLCHbackground: '0.28 0.04', // set the lightness/chroma for the header background
          OKLCHtext: '0.85 0.15' // set the lightness/chroma for the header text
        }
      });

      diagram.grid = new go.Panel('Grid', {
        gridCellSize: new go.Size(30, 30),
        visible: true
      }).add(
        new go.Shape('LineH', { stroke: 'lightgray' }).theme('stroke', 'gridStroke'),
        new go.Shape('LineV', { stroke: 'lightgray' }).theme('stroke', 'gridStroke')
      );

      themeUnsub = currentTheme.subscribe(theme => {
        diagram.themeManager.currentTheme = theme;
        updateSelectionAdornments();
      });

      // open the editing modal on double click
      diagram.addDiagramListener('ObjectDoubleClicked', e => {
        let node = e.subject.part;
        if (!(node instanceof go.Node)) return;

        const keys = findKeysForNode(node);
        let pairsToEdit: PairList = dataManager.data;
        for (let k of keys) {
          pairsToEdit = pairsToEdit.findPairByKey(k)?.value;
        }

        openModal(pairsToEdit.copy(), keys);

        // regenerate the diagram on close
        closeModal = (newPairList: PairList) => {
          dataManager.updateData(newPairList, keys, 'modal');
        };
      });

      dataUnsub = dataManager.subscribe((pairs, keys) => {
        if (!diagram.div) return;

        // json updated
        let originalData = dataManager.data.resolveKeys(keys)?.value ?? dataManager.data;
        if (!(originalData instanceof PairList)) originalData = undefined;
        buildDiagram(originalData, pairs, keys);

        // commit forces an immediate diagram redraw so updateThemeBindings must be in the same
        // transaction as updateSelectionAdornments to prevent flashing colors.
        diagram.model.commit(() => {
          diagram.updateAllThemeBindings();
          updateSelectionAdornments();
        }, null); // null to skip undo manager
      }, true);
    })();

    selectionChangedListener = (keys: KeyArray | null) => {
      if (!diagram.div) return;

      selectedKeys = keys;
      updateSelectionAdornments();

      // length === 0 or selectedKeys === null
      if (!selectedKeys?.length) {
        diagram.commandHandler.zoomToFit();
        return;
      }

      const node = findNodeForKeys(selectedKeys.slice(0, -1), true);
      if (!node) {
        diagram.commandHandler.zoomToFit();
        return;
      }

      // this is the whole shape behind all of the props in the node, so we
      // are only excluding the header in the bounds
      const selectedShape = node.findObject('bodyShape') as go.Shape | null;
      const node1Bounds = selectedShape?.getDocumentBounds() ?? node.getDocumentBounds();

      // iterate through node.data.props to find the index and go.Panel of Pair
      const propTable = node.findObject('propTable') as go.Panel | null;
      let rowItem: go.Panel | null = null;
      let idx = 0;
      if (propTable) {
        for (let pair of (node.data as NodeData).props) {
          if (pair.key === keys!.at(-1)) break;
          idx++;
        }

        rowItem = ([...propTable.elements]?.[idx] as go.Panel) ?? null;
      }

      // max size before we switch to highlighting individual rows
      const maxSize = 350;

      let bnds: go.Rect | null = null;

      if (node?.findPort(selectedKeys.at(-1) + '') && selectedKeys.length) {
        const links = node.findLinksOutOf(selectedKeys.at(-1) + '');
        const node2 = links.first()?.toNode;
        if (node2 && links.count === 1) {
          bnds = node2.getDocumentBounds();
        }
      }

      if (rowItem && (node1Bounds.width > maxSize || node1Bounds.height > maxSize)) {
        if (bnds) bnds.unionRect(rowItem.getDocumentBounds());
        else bnds = rowItem.getDocumentBounds();
      } else {
        if (bnds) bnds.unionRect(node.getDocumentBounds());
        else bnds = node1Bounds;
      }

      const scale = bnds.width > maxSize || bnds.height > maxSize ? 1.05 : 3;

      const zoomRect = new go.Rect(
        bnds.x - (bnds.width * scale - bnds.width) / 2,
        bnds.y - (bnds.height * scale - bnds.height) / 2,
        bnds.width * scale,
        bnds.height * scale
      );

      // in gojs version >= 3.1.0-b1, zoomToFit will work for this
      diagram.commandHandler.zoomToFit(zoomRect);
    };
  });

  onDestroy(() => {
    if (themeUnsub) themeUnsub();
    if (dataUnsub) dataUnsub();
  });
</script>

<div class="relative h-full w-full">
  <!--
    the diagram and overlay are placed in separate divs to hide overflow in
    the canvas and not the overlay
  -->

  <div
    class="border-ui-secondary absolute top-0 left-0 h-full w-full overflow-hidden border-l-[1.5px] bg-gray-50"
  >
    <div bind:this={diagramDiv} class="z-10 h-full w-full select-none"></div>
  </div>

  <div class="relative top-0 left-0 h-full w-full">
    <!-- only create the overlay after the diagram is created -->
    {#await diagramPromise then dia}
      <DiagramOverlay diagram={dia} />
    {/await}
  </div>
</div>
