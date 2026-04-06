<script lang="ts">
  import go from 'gojs';
  import { onMount } from 'svelte';
  import type { Axis } from '$lib/types';

  interface Props {
    axis1?: Axis;
    axis2?: Axis;
    model?: go.GraphLinksModel;
    selection: string | null;
  }

  let diagramDiv: HTMLDivElement;
  let myDiagram: go.Diagram;

  let { axis1 = 'X', axis2 = 'Y', model, selection = $bindable() }: Props = $props();
  onMount(() => {
    // go.Diagram.licenseKey = ...

    const coordToAxis = {
      X: 0,
      Y: 1,
      Z: 2
    };

    // take all the axes and filter out axis1 and axis2 to get the remaining axis
    // for zOrder in the diagram
    const zOrderAxis = ['X', 'Y', 'Z'].filter((v) => v != axis1 && v != axis2)[0] as Axis;

    const node = new go.Node({ resizable: true, resizeObjectName: 'SHAPE' })
      .bindTwoWay(
        'location',
        'loc',
        (loc, d) => {
          const p = new go.Point(
            loc[coordToAxis[axis1]] - (axis1 === 'Z' ? d.data.size[2] : 0),
            loc[coordToAxis[axis2]]
          );
          return p;
        },
        (loc: go.Point, data) => {
          const newLoc = [...data.loc];
          newLoc[coordToAxis[axis1]] = loc.x + (axis1 === 'Z' ? data.size[2] : 0);
          newLoc[coordToAxis[axis2]] = loc.y;
          return newLoc;
        }
      )
      .bind('zOrder', '', (data, obj) => {
        // zOrder the Nodes by depth axis from 3d view
        const i = coordToAxis[zOrderAxis];
        const pos = data.loc[i] * (zOrderAxis === 'Z' ? -1 : 1); // z axis inverted
        if (zOrderAxis === 'Z') return pos; // z pos is relative to the top

        const size = obj.data.size[i];
        return pos + size;
      })
      .add(
        new go.Shape({ name: 'SHAPE' })
          .bindTwoWay(
            'desiredSize',
            'size',
            (size) => {
              return new go.Size(size[coordToAxis[axis1]], size[coordToAxis[axis2]]);
            },
            (size: go.Size, data) => {
              const newSize = [...data.size];
              newSize[coordToAxis[axis1]] = size.width;
              newSize[coordToAxis[axis2]] = size.height;
              return newSize;
            }
          )
          .bind('fill', 'color')
      );

    myDiagram = new go.Diagram(diagramDiv, {
      ChangedSelection: (e) => {
        selection = e.subject.first()?.key ?? null;
      },
      'animationManager.isEnabled': false,
      'undoManager.isEnabled': true,
      'layout.isInitial': false,
      'layout.isOngoing': false,
      nodeTemplate: node
    });

    const gridColor = {
      XY: 'oklch(0.962 0.044 156.743)',
      YZ: 'oklch(0.932 0.032 255.585)',
      XZ: 'oklch(0.936 0.032 17.717)'
    }[`${axis1}${axis2}` as 'XY' | 'YZ' | 'XZ'];
    diagramDiv.style.background = gridColor;

    myDiagram.grid = new go.Panel('Grid', {
      gridCellSize: new go.Size(30, 30),
      visible: true
    }).add(
      new go.Shape('LineH', { stroke: 'lightgray' }),
      new go.Shape('LineV', { stroke: 'lightgray' })
    );

    $effect(() => {
      if (model) myDiagram.model = model;
      if (selection) {
        myDiagram.select(myDiagram.findNodeForKey(selection));
      } else {
        myDiagram.clearSelection();
      }
    });
  });
</script>

<div class="h-full w-full bg-green-100 p-[1px]">
  <span class="absolute z-20 bg-green-200 font-mono text-xs">{axis1}/{axis2}</span>
  <div bind:this={diagramDiv} class="z-10 h-full w-full select-none"></div>
</div>
