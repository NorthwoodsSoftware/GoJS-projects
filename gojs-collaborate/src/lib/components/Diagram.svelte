<!--
  This component manages the diagram and how it is constructed based on changes to the data
-->

<script lang="ts">
  import go from 'gojs';
  import * as Y from 'yjs';

  import DiagramOverlay from '$lib/components/DiagramOverlay.svelte';

  import { onDestroy, onMount } from 'svelte';
  import type { Unsubscriber } from 'svelte/store';
  import { currentTheme } from '$lib/stores';
  import { DataType } from '$lib/types';

  import type { TypedMap } from 'yjs-types';
  import { isCategory } from '$lib/types';
  import type {
    DocSyncFunction,
    ClientData,
    YClientData,
    NodeData,
    YNodeData,
    YSelectionData,
    YNodes,
    YLinks,
    YGenericData
  } from '$lib/types';

  interface Props {
    sync: DocSyncFunction;
    clientN?: number;
  }

  let { sync, clientN }: Props = $props();

  let debugBox: HTMLSpanElement;

  let diagramDiv: HTMLDivElement;
  let diagram: go.Diagram = $state(new go.Diagram());

  // initialize doc
  const yDoc = new Y.Doc();
  const yNodes = yDoc.getMap('nodes') as YNodes; // map key to "node" or "client"
  const yLinks = yDoc.getMap('links') as YLinks;

  sync(yDoc, clientDisconnected); // start syncing this doc with other clients

  // initialize this client
  const client = new Y.Map() as YClientData;
  client.set('category', DataType.Client);
  client.set('key', yDoc.clientID);
  client.set('location', 'NaN NaN');

  // collect already used client colors
  const hues: number[] = [];
  Array.from(yNodes.values()).forEach(n => {
    if (!isCategory(n, DataType.Client)) return;
    hues.push(n.get('hue')!);
  });

  // must be 80% the max distance possible distance from nearest hue
  const minDist = (360 / (hues.length + 1)) * 0.8;

  let _hue = 0;
  // try 500 times to make a significantly unique color
  for (let i = 0; i < 500; i++) {
    _hue = 360 * Math.random();

    let dist = Infinity;
    for (const h of hues) {
      const d = Math.min(Math.abs(h - _hue), 360 - Math.abs(h - _hue));
      if (d < dist) dist = d;
    }

    if (dist >= minDist) break;
  }

  client.set('hue', _hue);
  yNodes.set(yDoc.clientID + '', client);

  // setup selection object
  const selection = new Y.Map() as YSelectionData;
  selection.set('key', yDoc.clientID + 'selection');
  selection.set('ownerID', yDoc.clientID);
  selection.set('category', DataType.SelectionBounds);
  selection.set('width', 0);
  selection.set('height', 0);

  yNodes.set(yDoc.clientID + 'selection', selection);

  let skipsModelChanged = false;
  let skipsDocChanged = false;

  // keep track of subscriptions to remove them when this component is destroyed
  let themeUnsub: Unsubscriber;

  let font = 'normal 350 16pt monospace'; // defined in mount later

  // mini cursor template
  function miniCursor(init?: Partial<go.Part>): go.Panel {
    const p = new go.Panel('Auto');

    const shape = new go.Shape({
      geometryString:
        'F M248,121.58a15.76,15.76,0,0,1-11.29,15l-.2.06-78,21.84-21.84,78-.06.2a15.77,15.77,0,0,1-15,11.29h-.3a15.77,15.77,0,0,1-15.07-10.67L41,61.41a1,1,0,0,1-.05-.16A16,16,0,0,1,61.25,40.9l.16.05,175.92,65.26A15.78,15.78,0,0,1,248,121.58Z',
      strokeWidth: 1 / (init?.scale ?? 0.066),
      scale: init?.scale ?? 0.066,
      angle: 135 + (init?.angle ?? 0)
    })
      .themeData(
        'stroke',
        '',
        'colors',
        () => {
          return 'OKLCStroke';
        },
        (val, obj) => {
          const data = yNodes.get(obj.panel.data + '') as YClientData; // get the users cursor

          if (data?.get('hue')) return `oklch(${val} ${data.get('hue')})`;
          else return 'dodgerblue';
        }
      )
      .themeData(
        'fill',
        '',
        'colors',
        () => {
          return 'OKLCFill';
        },
        (val, obj) => {
          const data = yNodes.get(obj.panel.data + '') as YClientData; // get the users cursor

          if (data?.get('hue')) return `oklch(${val} ${data.get('hue')})`;
          else return 'dodgerblue';
        }
      );

    if (init) {
      // remove already set properties
      delete init.scale;
      delete init.angle;

      p.set(init);
    }

    return p.add(shape);
  }

  function selAdornItemBind(n: number) {
    return (arr: any) => {
      if (!arr || !arr.length || !Array.isArray(arr)) return arr;
      return arr.filter((_, i) => i % 4 === n); // only show items every nth item
    };
  }

  // node selection adornment, this shows a cursor for each user that has selected the adorned node
  const selectionAdornment = new go.Adornment('Spot', {
    name: 'selectionAdornment',
    background: null,
    category: 'selection' // set the category for this adornment
  }).add(
    new go.Placeholder(),
    new go.Panel('Vertical', {
      alignment: go.Spot.Left,
      alignmentFocus: go.Spot.Right,
      itemTemplate: miniCursor({ angle: 0 })
    }).bind('itemArray', 'selectedBy', selAdornItemBind(0)),
    new go.Panel('Vertical', {
      alignment: go.Spot.Right,
      alignmentFocus: go.Spot.Left,
      itemTemplate: miniCursor({ angle: 180 })
    }).bind('itemArray', 'selectedBy', selAdornItemBind(1)),
    new go.Panel('Horizontal', {
      alignment: go.Spot.Top,
      alignmentFocus: go.Spot.Bottom,
      itemTemplate: miniCursor({ angle: 90 })
    }).bind('itemArray', 'selectedBy', selAdornItemBind(2)),
    new go.Panel('Horizontal', {
      alignment: go.Spot.Bottom,
      alignmentFocus: go.Spot.Top,
      itemTemplate: miniCursor({ angle: -90 })
    }).bind('itemArray', 'selectedBy', selAdornItemBind(3))
  );

  function keyIsNode(key: go.Key): boolean {
    if (key == null) return false;
    return !key.toString().includes('link');
  }

  function updateSelection(node: go.Node | go.Link) {
    const data = node.data as NodeData;
    if (data.category !== DataType.Node) return;

    // update "selection" adornment
    const adornments = node.adornments;
    const selection = data.selectedBy ?? [];
    // const selection = data.selectedBy;
    let adorn: go.Adornment | null = null;
    while (adornments.next()) {
      if (adornments.value.name === 'selectionAdornment') {
        adorn = adornments.value;
        break;
      }
    }

    if (adorn && !selection.length) {
      adorn.adornedObject = null;
      diagram.remove(adorn);
    } else if (!adorn && selection.length) {
      adorn = selectionAdornment.copyTemplate();
      adorn.adornedObject = node;
    }
  }

  function updateDoc(key: go.Key, isNode?: boolean) {
    if (typeof isNode !== 'boolean') isNode = keyIsNode(key);

    let yMap: YLinks | YNodes; // yLinks or yNodes
    let goPart; // link or node

    if (isNode) {
      yMap = yNodes;
      goPart = diagram.findNodeForKey(key);
    } else {
      yMap = yLinks;
      goPart = diagram.findLinkForKey(key);
    }

    let yObj = yMap.get(key + '') as TypedMap<{ [key: string]: any }>; // yNode or yLink

    if (!yObj) {
      yObj = yMap.set(key + '', new Y.Map() as any) as TypedMap<{ [key: string]: any }>;
      yObj.set('key', key + '');
    }

    // const goPart = diagram.findNodeForKey(key);
    if (!goPart) return;
    const data = goPart.data as NodeData;

    // set who last modified this object for undo manager
    skips(m => {
      m.set(data, 'lastModifiedBy', yDoc.clientID);
    });

    for (const key of Object.keys(data) as (keyof NodeData)[]) {
      if (key === 'key') continue;
      if (yObj.get(key) === data[key]) continue;

      yObj.set(key, data[key]);
    }

    // there may also be global properties that are defined that should not be
    // for (const key of yObj.keys()) {
    //   console.log(key);
    //   if (key === 'key') continue;
    //   if (yObj.get(key) === data[key]) continue;

    //   console.log(key, 'is wrong');

    //   yObj.set(key, data[key]);
    // }

    // if (isNode) updateSelection(goPart);
    updateSelection(goPart);
  }

  function updateModel(key: go.Key, isNode?: boolean) {
    if (typeof isNode !== 'boolean') isNode = keyIsNode(key);

    if (key === yDoc.clientID) return;

    let yMap; // yLinks or yNodes

    if (isNode) {
      yMap = yNodes;
    } else {
      yMap = yLinks;
    }

    let yObj = yMap.get(key + '') as TypedMap<{ [key: string]: any }>; // node or link

    if (!yObj) return;
    if (yObj.get('ownerID') === yDoc.clientID) return;

    let goPart = isNode ? diagram.findNodeForKey(key) : diagram.findLinkForKey(key);

    if (!goPart && yObj.get('isDeleted')) return;

    if (!goPart) {
      const goObjectData: go.ObjectData = {};
      for (const key of yObj.keys()) {
        goObjectData[key] = yObj.get(key);
      }

      if (isNode) {
        diagram.model.addNodeData(goObjectData);
        goPart = diagram.findNodeForData(goObjectData);
      } else {
        (diagram.model as go.GraphLinksModel).addLinkData(goObjectData);
        goPart = diagram.findLinkForData(goObjectData);
      }

      if (!goPart)
        throw new Error(
          `(${isNode ? 'node' : 'link'}) could not be found after creation: ${goObjectData}`
        );
    }

    if (yObj.get('isDeleted')) {
      diagram.remove(goPart);
      yMap.delete(key + '');
      return;
    }

    for (const key of yObj.keys()) {
      if (key === 'key') continue;
      if (yObj.get(key) === goPart.data[key]) continue;
      diagram.model.set(goPart.data, key, yObj.get(key));
    }

    updateSelection(goPart);
  }

  function clientDisconnected(clientID: number) {
    const node = diagram.findNodeForKey(clientID);
    if (!node) return;

    skips(m => {
      // remove the disconnected clients cursor
      diagram.remove(node);

      // undo any selections they had
      for (const n of diagram.nodes) {
        const data = n.data as NodeData;
        if (data.key.startsWith(clientID + '')) {
          diagram.remove(n); // remove any special parts they had like the selection box
          return;
        }
        if (!data.selectedBy || !data.selectedBy.length) continue;

        const idx = data.selectedBy.indexOf(clientID);
        if (idx >= 0) m.removeArrayItem(data.selectedBy, idx);
      }
    });
  }

  // skip undo manager and model change listener
  function skips(func: (m: go.Model) => void) {
    const oldSkips = skipsModelChanged;
    skipsModelChanged = true;

    diagram.model.commit(func, null);

    skipsModelChanged = oldSkips;
  }

  function toHex(color: string): string {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = color;
    return ctx.fillStyle; // returns hex format
  }

  onMount(() => {
    // go.Diagram.licenseKey = ...

    // this is async to wait for the font to load before making the diagram
    font = getComputedStyle(document.documentElement).font;
    diagram = new go.Diagram(diagramDiv, {
      'animationManager.isInitial': false, // disable initial loading animation
      'animationManager.isEnabled': true,
      'undoManager.isEnabled': true,
      // 'undoManager.isEnabled': false,
      scrollMode: go.ScrollMode.Infinite
    });

    if (!(window as any).myDiagram) (window as any).myDiagram = diagram; // For debugging purposes only
    if (!(window as any)[`myDiagram${clientN}`]) (window as any)[`myDiagram${clientN}`] = diagram; // For debugging purposes only

    // setup light/dark
    diagram.themeManager.readsCssVariables = true; // use css variables in theme
    diagram.themeManager.changesDivBackground = true; // change diagram background color

    diagram.themeManager.set('light', {
      colors: {
        div: '#f5f6f2',
        text: 'var(--color-ui-text)',
        linkStroke: 'rgb(150,150,150)',
        gridStroke: 'var(--color-stone-300)',

        primary: 'var(--color-ui-primary)',
        secondary: 'var(--color-ui-secondary)',
        tertiary: 'var(--color-ui-tertiary)',
        quaternary: 'var(--color-ui-quaternary)',

        OKLCFill: '1 0.08', // set the lightness/chroma for the fill
        OKLCStroke: '0.85 0.15', // set the lightness/chroma for the stroke
        dragSelect: `oklch(0.85 0.15 ${client.get('hue')})`
      }
    });

    // The css variables here will be the dark theme versions because when GoJS
    // tests the value of the css variables the root element will have the "dark" class
    diagram.themeManager.set('dark', {
      colors: {
        div: '#08090a',
        text: 'var(--color-ui-text)',
        linkStroke: 'var(--color-zinc-400)',
        gridStroke: 'var(--color-zinc-800)',

        primary: 'var(--color-ui-primary)',
        secondary: 'var(--color-ui-secondary)',
        tertiary: 'var(--color-ui-tertiary)',
        quaternary: 'var(--color-ui-quaternary)',

        OKLCFill: '0.35 0.04', // set the lightness/chroma for the fill
        OKLCStroke: '0.85 0.15', // set the lightness/chroma for the stroke
        dragSelect: `oklch(0.85 0.15 ${client.get('hue')})`
      }
    });

    // node context menu
    const contextMenu = go.GraphObject.build('ContextMenu') // that has one button
      .add(
        go.GraphObject.build('ContextMenuButton', {
          click: (e, obj) => {
            const data = obj.part?.data as NodeData | null;
            const dia = obj.part?.diagram;
            if (!data || !dia) return;

            const input = document.createElement('input');
            input.type = 'color';
            input.value = toHex(data.color);
            input.click();

            const originalColor = data.color;

            // live update the color but skip undo manager and model change listener
            input.addEventListener('input', () => {
              skips(m => {
                if (data) m.set(data, 'color', input.value);
              });
            });

            // add the last selected color to undo manager
            input.addEventListener('change', () => {
              // reset the color just before final change so that our final commit isn't a no-op
              skips(m => {
                if (data) m.set(data, 'color', originalColor);
              });

              dia.model.commit(m => {
                m.set(data, 'color', input.value);
              }, 'Changed Color');
            });
          },
          'ButtonBorder.fill': 'white',
          _buttonFillOver: 'skyblue'
        }).add(new go.TextBlock('Change Color'))
        // more ContextMenuButtons would go here
      );

    // node template
    diagram.nodeTemplateMap.add(
      DataType.Node,
      new go.Node('Auto', {
        locationSpot: go.Spot.Center,
        contextMenu: contextMenu,
        selectionAdorned: false,
        resizable: true,
        resizeObjectName: 'SHAPE',
        rotatable: true,
        rotateObjectName: 'SHAPE'
      })
        .bindTwoWay(
          'location',
          'location',
          (val, obj) => {
            // console.log('from string to point');
            return go.Point.parse(val);
          },
          (val, data) => {
            // console.log('from point to string');
            // console.log(diagram.undoManager.isUndoingRedoing);
            if (diagram.undoManager.isUndoingRedoing) {
              if ((data as NodeData).lastModifiedBy !== yDoc.clientID)
                return diagram.findNodeForData(data)?.location;
            }
            return go.Point.stringify(val);
          }
        )
        .add(
          new go.Shape('RoundedRectangle', {
            name: 'SHAPE',
            strokeWidth: 2,
            toMaxLinks: Infinity,
            fromMaxLinks: Infinity,
            fromLinkable: true,
            toLinkable: true,
            portId: '',
            cursor: 'pointer'
          })
            .theme('fill', 'secondary')
            .bind('stroke', 'color')
            .bindTwoWay('desiredSize', 'size', go.Size.parse, go.Size.stringify)
            .bindTwoWay('angle'),
          new go.TextBlock({
            font: font,
            margin: 6,
            editable: true
          })
            .theme('stroke', 'text')
            .bindTwoWay('text')
          // new go.TextBlock({
          //   font: font,
          //   margin: 6
          // })
          //   .theme('stroke', 'text')
          //   .bind('text', 'key', k => (typeof k === 'string' ? `"${k}"` : k))
        )
    );

    // client cursor template
    diagram.nodeTemplateMap.add(
      DataType.Client,
      new go.Node('Auto', {
        layerName: 'Tool',
        pickable: false
      })
        .bind('location', 'location', go.Point.parse, go.Point.stringify)
        .add(
          new go.Shape({
            geometryString:
              'F M248,121.58a15.76,15.76,0,0,1-11.29,15l-.2.06-78,21.84-21.84,78-.06.2a15.77,15.77,0,0,1-15,11.29h-.3a15.77,15.77,0,0,1-15.07-10.67L41,61.41a1,1,0,0,1-.05-.16A16,16,0,0,1,61.25,40.9l.16.05,175.92,65.26A15.78,15.78,0,0,1,248,121.58Z',
            strokeWidth: 1 / 0.1,
            scale: 0.1
          })
            .theme('stroke', 'OKLCStroke', 'colors', null, (LC, obj) => {
              const data: ClientData = obj.part.data;
              return `OKLCH(${LC} ${data.hue})`;
            })
            .theme('fill', 'OKLCFill', 'colors', null, (LC, obj) => {
              const data: ClientData = obj.part.data;
              return `OKLCH(${LC} ${data.hue})`;
            })
        )
    );

    // client selection template
    diagram.nodeTemplateMap.add(
      DataType.SelectionBounds,
      new go.Node('Auto', {
        layerName: 'Background',
        pickable: false,
        selectable: false,
        isActionable: false
      })
        .bind('location', 'location', go.Point.parse, go.Point.stringify)
        .add(
          new go.Shape({
            fill: 'rgba(255,255,255,0.1)',
            stroke: 'white'
          })
            .bind('width')
            .bind('height')
            .themeData(
              'stroke',
              '',
              'colors',
              () => {
                return 'OKLCStroke';
              },
              (val, obj) => {
                const data = yNodes.get(obj.part.data.ownerID + '') as YClientData; // get the users cursor

                if (data?.get('hue')) return `oklch(${val} ${data.get('hue')})`;
                else return 'white';
              }
            )
            .themeData(
              'fill',
              '',
              'colors',
              () => {
                return 'OKLCFill';
              },
              (val, obj) => {
                const data = yNodes.get(obj.part.data.ownerID + '') as YClientData; // get the users cursor

                if (data?.get('hue')) return `oklch(${val} ${data.get('hue')} / 33%)`;
                else return 'dodgerblue';
              }
            )
        )
    );

    // link template
    diagram.linkTemplate = new go.Link({
      routing: go.Routing.AvoidsNodes,
      corner: Infinity,
      curve: go.Curve.JumpGap,
      // reshapable: true,
      // resegmentable: true,
      relinkableFrom: true,
      relinkableTo: true,
      toShortLength: 0,
      fromShortLength: 2,
      selectionAdorned: false,
      itemTemplate: miniCursor({
        // angle: 90,
        segmentOrientation: go.Orientation.Plus90,
        segmentOffset: new go.Point(0, -10.5),
        segmentIndex: NaN
      }).bindObject('segmentFraction', 'itemIndex', (i, obj) => {
        if (!isFinite(i)) return 0.5;

        // minus two to account for the existing elements in the panel
        return (i - 2 + 1) / ((obj.panel as go.Panel).elements.count - 2 + 1);
      })
    })
      .bind('itemArray', 'selectedBy', arr => {
        const array = [null, null, ...(arr ?? [])];
        // in this item array skip over the first two elements
        // without this the itemArray will overwrite the shapes that define the appearance of the link
        // future versions of GoJS after 3.1 may no longer require this odd solution
        return array;
      })
      .add(
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

    // background grid
    diagram.grid = new go.Panel('Grid', {
      gridCellSize: new go.Size(30, 30),
      visible: true
    }).add(
      new go.Shape('LineH', { stroke: 'lightgray' }).theme('stroke', 'gridStroke'),
      new go.Shape('LineV', { stroke: 'lightgray' }).theme('stroke', 'gridStroke')
    );

    // create the model
    diagram.model = new go.GraphLinksModel(
      [
        {
          selectedBy: null,
          category: DataType.Node,
          key: '1',
          text: 'Alpha',
          color: 'lightblue',
          location: '0 0'
        },
        {
          selectedBy: null,
          category: DataType.Node,
          key: '2',
          text: 'Beta',
          color: 'orange',
          location: '80 0'
        },
        {
          selectedBy: null,
          category: DataType.Node,
          key: '3',
          text: 'Gamma',
          color: 'lightgreen',
          group: '5',
          location: '5 100'
        },
        {
          selectedBy: null,
          category: DataType.Node,
          key: '4',
          text: 'Delta',
          color: 'pink',
          group: '5',
          location: '100 100'
        },
        {
          selectedBy: null,
          category: DataType.Node,
          key: '5',
          text: 'Epsilon',
          color: 'green',
          isGroup: true
        }
      ],
      [
        { key: 'link1', from: '1', to: '2', color: 'blue' },
        { key: 'link2', from: '2', to: '2' },
        { key: 'link3', from: '3', to: '4', color: 'green' },
        { key: 'link4', from: '3', to: '1', color: 'purple' }
      ]
    );
    // diagram.model = new go.GraphLinksModel(
    //   [
    //     {
    //       selectedBy: null,
    //       category: DataType.Node,
    //       key: '1',
    //       text: 'Alpha',
    //       color: 'lightblue',
    //       location: '-83 203'
    //     },
    //     {
    //       selectedBy: null,
    //       category: DataType.Node,
    //       key: '2',
    //       text: 'Beta',
    //       color: 'orange',
    //       location: '135 -60'
    //     }
    //   ],
    //   [
    //     {
    //       key: 'link1',
    //       from: '1',
    //       to: '2'
    //     }
    //   ]
    // );
    // diagram.model = new go.GraphLinksModel(
    //   [
    //     {
    //       selectedBy: null,
    //       category: DataType.Node,
    //       key: '1',
    //       text: 'Alpha',
    //       color: 'lightblue',
    //       location: '0 0'
    //     }
    //   ],
    //   []
    // );
    // diagram.model = new go.GraphLinksModel(
    //   [
    //     {
    //       selectedBy: null,
    //       category: DataType.Node,
    //       key: '1',
    //       text: 'Alpha',
    //       color: 'lightblue',
    //       location: '0 0'
    //     }
    //   ],
    //   [
    //     {
    //       key: 'link1',
    //       from: '1',
    //       to: '1'
    //     }
    //   ]
    // );

    // Custom string only make unique function
    diagram.model.makeUniqueKeyFunction = () => {
      let key = -1;
      while (diagram.findNodeForKey(key + '')) key--;
      return key + '';
    };
    (diagram.model as go.GraphLinksModel).linkKeyProperty = 'key';
    (diagram.model as go.GraphLinksModel).makeUniqueLinkKeyFunction = () => {
      let key = -1;
      while (diagram.findLinkForKey(`link${key}`)) key--;
      return `link${key}`;
    };

    diagram.addDiagramListener('ChangedSelection', e => {
      const selection = diagram.selection.iterator;

      while (selection.next()) {
        const sel = selection.value;

        const data = sel.data as NodeData | null;
        if (!data) return;

        if (!(sel instanceof go.Node) && !(sel instanceof go.Link)) continue;

        diagram.model.commit(m => {
          if (data.selectedBy) {
            m.set(data, 'selectedBy', [...data.selectedBy, yDoc.clientID]);
          } else {
            m.set(data, 'selectedBy', [yDoc.clientID]);
          }
        }, null);
      }

      const firstSel = diagram.selection.first();
      if (firstSel) debugBox.innerText = `${JSON.stringify(firstSel.data, null, 2).slice(2, -2)}`;
      else debugBox.innerText = '';
    });

    diagram.addDiagramListener('ChangingSelection', e => {
      const selection = diagram.selection.iterator;

      while (selection.next()) {
        const sel = selection.value;

        const data = sel.data as NodeData | null;
        if (!data) return;

        if (!(sel instanceof go.Node) && !(sel instanceof go.Link)) continue;

        diagram.model.commit(m => {
          if (data.selectedBy) {
            const idx = data.selectedBy.indexOf(yDoc.clientID);
            if (idx >= 0) {
              const arr = [...data.selectedBy];
              arr.splice(idx, 1);
              m.set(data, 'selectedBy', arr);
            }
          }
        }, null);
      }
    });

    yDoc.on('afterTransaction', transaction => {
      if (skipsDocChanged) return;

      skips(() => {
        transaction.changed.forEach((item, type) => {
          // console.log(clientN, item, type);
          // ignore any local change that isn't deletion
          if (!(type instanceof Y.Map)) return;
          if (transaction.local && !item.has('isDeleted') && !type?.get('isDeleted')) return;

          let key = type.get('key') as go.Key | undefined;

          const keys = [];
          if (key === undefined) {
            // assume items are the keys instead
            // key = item.values().next().value;
            // if (typeof key !== 'string') return;

            for (const k of item.values()) {
              if (typeof k === 'string') keys.push(k);
            }
          } else {
            keys.push(key);
          }

          for (const k of keys) {
            if (k === undefined) return;
            if (k === yDoc.clientID) return;

            // console.log(clientN, k);
            updateModel(k);
          }
        });
      });
    });

    const listenProps = new Set([
      'FinishedUndo',
      'FinishedRedo',
      'nodeDataArray',
      'linkDataArray',
      'location',
      'selectedBy',
      'text',
      'color',
      'group',
      'from',
      'to',
      'desiredSize',
      'angle'
    ]);
    // const listenProps = new Set(['nodeDataArray']);

    diagram.model.addChangedListener(e => {
      if (skipsModelChanged) return; // don't look for updates while propagating doc changes from other clients

      const prop = e.propertyName as string;
      const data = e.object as NodeData | ClientData | null;

      // if (!e.canRedo() || !e.canUndo()) return;
      // if (prop === 'location') return;
      // console.log(prop, e.newValue);
      // console.log(prop);
      if (!listenProps.has(prop)) return;

      // yDoc will group changes from transactions together. This way for each model change there
      // will be one call to afterTransaction.
      yDoc.transact(() => {
        if (prop === 'linkDataArray') {
          if (e.oldValue === null && e.newValue) {
            // add link

            // new links shouldn't be selected
            e.newValue.selectedBy = null;
            e.newValue.isDeleted = false;

            updateDoc(e.newValue.key, false);
          } else if (e.oldValue && e.newValue === null) {
            // remove link
            const key = e.oldValue.key + '';

            // Yjs has no explicit way to globally delete things so we will delete it locally and
            // globally "mark" it for deletion

            // return;
            let link = yLinks.get(key);
            // return;

            skipsDocChanged = true;
            if (!link) {
              // it may not have been added to the global data yet
              updateDoc(key, false);
              link = yLinks.get(key);
            }
            if (!link) throw new Error('Could not create link when not found');

            link.set('isDeleted', true);
            skipsDocChanged = false;
          }

          return;
        }

        if (prop === 'nodeDataArray') {
          if (e.oldValue === null && e.newValue) {
            // add node

            // new nodes shouldn't be selected
            e.newValue.selectedBy = null;
            e.newValue.isDeleted = false;

            updateDoc(e.newValue.key);
          } else if (e.oldValue && e.newValue === null) {
            // remove node
            const key = e.oldValue.key + '';

            // Yjs has no explicit way to globally delete things so we will delete it locally and
            // globally "mark" it for deletion

            const node = yNodes.get(key) as YNodeData;
            if (!node) throw new Error(`Could not find yNode to delete, key: ${key}`);
            node.set('isDeleted', true);
            // yNodes.delete(key);
          }

          return;
        }

        if (!data) return;

        if (prop === 'FinishedUndo' || prop === 'FinishedRedo') {
          // look through changes and get all the modified nodes
          // const nodesChanged = new Set<go.Key>();
          const keysChanged = new Set<go.ObjectData>();
          const keysAdded = new Set<go.ObjectData>();
          const keysRemoved = new Set<go.ObjectData>();

          for (const change of (data as any).changes as go.List<go.ChangedEvent>) {
            // console.log(change);
            if (change.object?.key != null) keysChanged.add(change.object);
            else if (change.oldValue === null && change.newValue) {
              // if (prop === 'FinishedUndo') keysAdded.add(change.newValue);
              // else keysRemoved.add(change.newValue);
              if (prop === 'FinishedUndo') keysRemoved.add(change.newValue);
              else keysAdded.add(change.newValue);
            } else if (change.oldValue && change.newValue === null) {
              if (prop === 'FinishedUndo') keysAdded.add(change.oldValue);
              else keysRemoved.add(change.oldValue);
              // keysRemoved.add(change.oldValue);
            }
          }

          // look for changes in each modified key
          Array.from(keysChanged).forEach(part => {
            let key = part.key ?? part.data?.key;
            if (key === undefined) return;

            updateDoc(key);
          });

          Array.from(keysAdded).forEach(part => {
            const data = part.data ?? part;
            let key = data.key;
            if (key === undefined) return;

            data.selectedBy = null;
            data.isDeleted = false;

            updateDoc(key);
          });

          Array.from(keysRemoved).forEach(part => {
            const data = part.data ?? part;

            let key = data.key;
            if (key === undefined) return;

            let yObj = keyIsNode(key) ? yNodes.get(key) : (yLinks.get(key) as YGenericData);
            if (!yObj)
              throw new Error(`client ${clientN}, Could not find yObj to delete, key: ${key}`);
            yObj.set('isDeleted', true);
          });

          return;
        }

        if (data.category === DataType.Client) return;

        updateDoc(data.key);
      });
    });

    // update the position of this clients cursor
    const _diaMouseMove = diagram.doMouseMove;
    diagram.doMouseMove = () => {
      const self = diagram;
      _diaMouseMove.call(self);

      if (self.currentTool.name === 'Panning') return;
      client.set('location', go.Point.stringify(self.lastInput.documentPoint));
    };

    // update the selection box position
    const _selMouseMove = diagram.toolManager.dragSelectingTool.doMouseMove;
    diagram.toolManager.dragSelectingTool.doMouseMove = () => {
      const self = diagram.toolManager.dragSelectingTool;
      _selMouseMove.call(self);

      if (!self.box || !self.isActive) return;
      const shape = self.box.findObject('SHAPE');
      if (!shape) return;

      yDoc.transact(() => {
        selection.set('location', go.Point.stringify(self.box!.position));
        selection.set('width', shape.desiredSize.width);
        selection.set('height', shape.desiredSize.height);
      });
    };

    const _selDeactivate = diagram.toolManager.dragSelectingTool.doDeactivate;
    diagram.toolManager.dragSelectingTool.doDeactivate = () => {
      const self = diagram.toolManager.dragSelectingTool;
      _selDeactivate.call(self);

      yDoc.transact(() => {
        selection.set('location', 'NaN NaN');
        selection.set('width', 0);
        selection.set('height', 0);
      });
    };

    // keep track of subscriptions to remove them later
    themeUnsub = currentTheme.subscribe(theme => {
      diagram.themeManager.currentTheme = theme;

      diagramDiv.style.borderColor = `oklch(${diagram.themeManager.findValue('OKLCStroke', 'colors')} ${client.get('hue')})`;
    });
  });

  onDestroy(() => {
    if (themeUnsub) themeUnsub();
  });
</script>

<div class="relative grow">
  <div class="absolute top-0 left-0 h-full w-full overflow-hidden bg-gray-50">
    <div bind:this={diagramDiv} class="z-10 h-full w-full border-[1.5px] select-none"></div>

    <!-- this div holds debug information -->
    <div
      hidden
      class="pointer-events-none absolute top-0 left-1/2 z-50 my-2 flex -translate-x-1/2 flex-col"
    >
      <!-- ID of this diagram -->
      <span class="text-center">{yDoc.clientID}</span>

      <!-- details about the currently selected part -->
      <pre bind:this={debugBox} class="text-sm opacity-65 select-none"></pre>
    </div>

    <DiagramOverlay {diagram} />
  </div>
</div>
