<script lang="ts">
  import type { NodeData } from '$lib/types';
  import go from 'gojs';
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
  import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
  import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';

  interface Props {
    model: go.GraphLinksModel;
    selection: string | null;
  }

  const selectionColor = 'dodgerblue';
  const selectionThickness = 4;
  const outlineColor = 'black';
  const outlineThickness = 0.75;

  let { model, selection = $bindable() }: Props = $props();

  let canvasElement: HTMLCanvasElement;
  let outerDiv: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);
  const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);
  const ambientLight = new THREE.AmbientLight(0x555555);
  scene.add(ambientLight);
  camera.position.set(-150, -500, 300);
  // This GoJS demo treats the Z axis as vertical (z up)
  // This is not the default in ThreeJS, so we need to change it:
  camera.up = new THREE.Vector3(0, 0, 1);

  let currentSelectedObject: string | null = null;
  // For convenience (when removing them all), we will group all THREE objects added to our scene
  let currentSceneGroup = new THREE.Group();

  function resizeCanvasToDisplaySize() {
    if (!outerDiv) return;
    const width = outerDiv.clientWidth;
    const height = outerDiv.clientHeight;
    // adjust displayBuffer size to match
    if (canvasElement.width !== width || canvasElement.height !== height) {
      // you must pass false here or three.js fights the browser
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function animate() {
    resizeCanvasToDisplaySize();
    controls.update();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function createScene(el: HTMLCanvasElement) {
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: el });
    controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target = new THREE.Vector3(200, 0, 0);

    // setup grids
    const units = 30;
    const size = 5000;
    const divisions = size/units;

    const gridXY = new THREE.GridHelper(size, divisions);
    gridXY.material.color.set('green');
    gridXY.rotation.x=Math.PI/2;
    gridXY.position.x += units/3;
    gridXY.position.y -= units/3;

    gridXY.material.opacity = 0.2;
    gridXY.material.transparent = true;

    scene.add(gridXY);

    controls.update();
    animate();
  }

  function sizeCube(n: NodeData, cube: THREE.Object3D) {
    cube.position.set(
      n.loc[0] + n.size[0] / 2,
      -n.loc[1] - n.size[1] / 2,
      -n.loc[2] - n.size[2] / 2
    );
  }

  function addObject(n: NodeData) {
    const isSelected = currentSelectedObject === n.key;
    const geometry = new THREE.BoxGeometry(n.size[0], n.size[1], n.size[2]);
    const material = new THREE.MeshLambertMaterial({
      color: n.color,
      emissive: new THREE.Color(n.color),
      emissiveIntensity: 0.5
    });
    const cube = new THREE.Mesh(geometry, material);
    sizeCube(n, cube);
    cube.name = n.key;
    currentSceneGroup.add(cube);

    // add object outline
    const outlineGeometry = new THREE.BoxGeometry(
      n.size[0],
      n.size[1],
      n.size[2],
    );
    const edges = new THREE.EdgesGeometry(outlineGeometry);

    const lineGeometry = new LineSegmentsGeometry().setPositions(
      edges.attributes.position.array as any as number[]
    );
    const lineMaterial = new LineMaterial({
      color: outlineColor,
      linewidth: outlineThickness,
    });
    lineMaterial.resolution.set(outerDiv.clientWidth, outerDiv.clientHeight);
    const outline = new LineSegments2(lineGeometry, lineMaterial);
    cube.add(outline);

    if (isSelected) {
      updateSelectionByKey(n.key, true);
    }
  }

  function updateSelectionByKey(key: string, isSelected: boolean) {
    const obj = scene.getObjectByName(key) as THREE.Mesh;
    if (!obj) return;
    if (!model) return;
    if (obj.children.length == 0) return;

    if (isSelected) {
      (obj.children[0] as LineSegments2).material.color.set(selectionColor);
      (obj.children[0] as LineSegments2).material.linewidth = selectionThickness;
    } else {
      (obj.children[0] as LineSegments2).material.color.set(outlineColor);
      (obj.children[0] as LineSegments2).material.linewidth = outlineThickness;
    }
  }

  // When the selection changes, update the Part to be outlined
  function updateSelection() {
    if (currentSelectedObject === selection) return;
    if (selection) {
      updateSelectionByKey(selection, true);
    }
    // old object
    if (currentSelectedObject) {
      updateSelectionByKey(currentSelectedObject, false);
    }
    currentSelectedObject = selection;
  }

  /**
   * Remove all objects from the scene and populate from the model.
   * This is done first on mount, and then done on any undo or redo
   * @param model
   */
  function populateScene(model: go.GraphLinksModel) {
    scene.remove(currentSceneGroup);
    currentSceneGroup = new THREE.Group();
    for (const n of model.nodeDataArray) {
      addObject(n as NodeData);
    }
    scene.add(currentSceneGroup);
    updateSelection();
  }

  onMount(() => {
    createScene(canvasElement);
    if (model) {
      populateScene(model);

      const listenProps = new Set(['loc', 'size', 'color', 'nodeDataArray', 'FinishedUndo', 'FinishedRedo']);
      model.addChangedListener((e) => {
        const prop = e.propertyName as string;
        const data = e.object as NodeData;
        if (!listenProps.has(prop) || !data) return;

        if (prop === 'FinishedUndo' || prop === 'FinishedRedo') {
          // Inefficient: rebuild the whole scene
          // This could be made more efficient by looking at the undo/redo changes
          // in the transaction, and updating the scene group accordingly, instead
          populateScene(model);
        }

        if (prop === 'nodeDataArray') {
          if (e.oldValue === null && e.newValue) {
            addObject(e.newValue as NodeData); // add node
          } else if (e.oldValue && e.newValue === null) {
            const obj = scene.getObjectByName(e.oldValue.key);
            if (!obj) return;
            currentSceneGroup.remove(obj); // delete node
          }
          return;
        }

        const obj = scene.getObjectByName(data.key);
        if (!obj) return;
        switch (prop) {
          case 'loc':
            sizeCube(data, obj);
            break;
          case 'size':
            currentSceneGroup.remove(obj);
            addObject(data);
            break;
          case 'color':
            currentSceneGroup.remove(obj);
            addObject(data);
            break;
        }
      });
    }

    // When the selection changes, update the Part to display red
    $effect(updateSelection);

    // determine what 3d object has been clicked on
    let downEvent: MouseEvent | null = null;
    outerDiv.addEventListener('pointerdown', event => {
      downEvent = event;
    });
    outerDiv.addEventListener('pointerup', event => {
      if (event.button !== 0) return; // left click only
      if (!downEvent) return;
      // ignore click and drag
      if ((event.x - downEvent.x)**2 + (event.y - downEvent.y)**2 > 4) return;

      const pointer = new THREE.Vector2();
      pointer.x = ( (event.clientX - outerDiv.offsetLeft) / outerDiv.clientWidth ) * 2 - 1;
	    pointer.y = - ( (event.clientY - outerDiv.offsetTop) / outerDiv.clientHeight ) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        const obj = intersects[0];
        selection = obj.object.name;
      } else {
        selection = null;
      }
    });
  });
</script>

<div class="h-full w-full leading-[0rem]" bind:this={outerDiv}>
  <canvas bind:this={canvasElement}></canvas>
</div>
