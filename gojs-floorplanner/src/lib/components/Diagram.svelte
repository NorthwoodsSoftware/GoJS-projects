<script lang="ts">
  // Contains the GoJS Diagram and its initialization code as well as data updating for the floor info page
  // and functions for saving, loading, and printing
  import go, { ScrollMode } from 'gojs';
  import { useFeet, showRoomAreas, hideDividers, hideMeasurements } from '$lib/stores/stores';
  import { onMount } from 'svelte';
  import { WallBuilderTool } from '$lib/gojs/WallBuilderTool';
  import { WallPartResizingTool } from '$lib/gojs/WallPartResizingTool';
  import { NodeLabelDraggingTool } from '$lib/gojs/NodeLabelDraggingTool';
  import { FloorPlanDraggingTool } from '$lib/gojs/FloorPlanDraggingTool';
  import * as FPUtils from '$lib/gojs/FloorPlanUtils';
  import * as FPTemplates from '$lib/gojs/FloorPlanTemplates';
  import { InitializeListeners } from '$lib/gojs/Listeners';

  let {
    exampleModel,
    resizing,
    myDiagram = $bindable(),
    wallEnableFunc = $bindable(),
    saveFunc = $bindable(),
    undoRedoFunc = $bindable(),
    printFunc = $bindable(),
    model = $bindable(),
    selectedObject = $bindable(),
    floorData = $bindable(),
    viewing = $bindable(),
    createRoomFunc = $bindable(),
    zoomToFit = $bindable(),
    switchUnitFunc = $bindable(),
    areaVisFunc = $bindable(),
    dividerVisFunc = $bindable(),
    measurementVisFunc = $bindable(),
    showingInvalidRoomAlert = $bindable()
  } = $props();

  let diagramDiv: HTMLDivElement;

  onMount(() => {
    // go.Diagram.licenseKey = ...
    // Loads last viewed model
    const savedModel = localStorage.getItem('savedFloorPlanModel');
    const lastViewedModel = localStorage.getItem('lastViewedModel');
    if (lastViewedModel === 'saved' && savedModel) {
      model = savedModel;
      viewing = 'saved';
    } else {
      model = exampleModel;
      viewing = 'example';
    }
    // Loads last used unit and sets it
    const lastUsedUnit = localStorage.getItem('lastUsedUnit');
    if (lastUsedUnit) {
      $useFeet = lastUsedUnit === 'feet' ? true : false;
    } else {
      localStorage.setItem('lastUsedUnit', 'meters');
    }
    // Initializes the diagram
    init();
    // Handles wall building instructions from the page
    function wallBuilding(command: string) {
      if (command === 'enableBuilder') {
        enableWallBuilding();
      } else if (command === 'disableBuilder') {
        disableWallBuilding();
      } else if (command === 'buildWalls') {
        buildWalls();
      } else if (command === 'buildDividers') {
        buildDividers();
      } else if (command === 'buildMeasurement') {
        buildMeasurement();
      }
    }
    // Handles save and load instructions from the page
    function saveAndLoad(isSaving: boolean, loadSaved?: boolean) {
      if (isSaving) {
        save();
      } else {
        if (loadSaved !== undefined) {
          load(loadSaved);
        } else {
          // Calls default load if no saved model exists
          load();
        }
      }
    }
    // Handles undo and redo buttons in the page's edit menu
    function undoRedo(isUndo: boolean) {
      if (isUndo) {
        myDiagram.undoManager.undo();
      } else {
        myDiagram.undoManager.redo();
      }
    }
    wallEnableFunc = wallBuilding;
    saveFunc = saveAndLoad;
    undoRedoFunc = undoRedo;
    printFunc = printDiagram;
    createRoomFunc = () => FPUtils.createRoom(myDiagram, setShowInvalidRoomAlert);
    switchUnitFunc = updateUnits;
    areaVisFunc = updateAreasVisibility;
    dividerVisFunc = updateDividerVisibility;
    measurementVisFunc = updateMeasurementVisibility;
    zoomToFit = () => myDiagram.zoomToFit();
  });

  // Initializes the GoJS Diagram
  function init() {
    // Diagram properties
    if (!myDiagram) {
      // Hot reload: check if Diagram already initialized
      myDiagram = new go.Diagram(diagramDiv, {
        'draggingTool.isGridSnapEnabled': true, // dragged nodes will snap to a grid of 10x10 cells
        'draggingTool.gridSnapCellSize': FPTemplates.GRIDSNAPSIZE,
        'undoManager.isEnabled': true,
        'animationManager.isEnabled': false,
        'grid.visible': true,
        scrollMode: ScrollMode.Infinite,
        'toolManager.hoverDelay': 500,
        grid: FPTemplates.meterGrid,
        initialAutoScale: go.AutoScale.Uniform,
        contextMenu: diagramContextMenu
      });
    } else {
      myDiagram.div = diagramDiv;
    }

    // Allows access from the console
    (window as any).myDiagram = myDiagram;

    // Initializes diagram listeners and model change listener
    // Pass in selection handling function for selectedObject and floorData runes usage
    InitializeListeners(myDiagram, handleSelectionChangedData);

    // Defines model, gives links keys
    myDiagram.model = new go.GraphLinksModel({
      linkFromPortIdProperty: 'fromPort',
      linkToPortIdProperty: 'toPort',
      linkKeyProperty: 'key'
    });

    // Sets node template map
    myDiagram.nodeTemplateMap = FPTemplates.nodeTemplateMap;

    // Sets link template map
    myDiagram.linkTemplateMap = FPTemplates.linkTemplateMap;

    // Adds custom wall builder tool, passes in link and node template
    const wallBuilderTool = new WallBuilderTool(
      FPTemplates.wallPointNodeTemplate,
      FPTemplates.tempWallTemplate,
      FPTemplates.tempDividerTemplate,
      FPTemplates.measurementLinkTemplate
    );
    myDiagram.toolManager.mouseDownTools.insertAt(0, wallBuilderTool);
    wallBuilderTool.isEnabled = false;

    // Adds a tool for resizing wall parts
    const wallPartResizingTool = new WallPartResizingTool(FPTemplates.wallStrkW);
    myDiagram.toolManager.mouseDownTools.insertAt(4, wallPartResizingTool);

    // Sets the background color of the text block editor
    myDiagram.toolManager.textEditingTool.defaultTextEditor.mainElement!.style.background = 'white';

    // Dragging tool for room labels
    const nodeLabelDraggingTool = new NodeLabelDraggingTool();
    myDiagram.toolManager.mouseMoveTools.insertAt(1, nodeLabelDraggingTool);

    // General drag tool to handle what can be dragged at the same time
    const floorPlanDraggingTool = new FloorPlanDraggingTool();
    myDiagram.toolManager.mouseMoveTools.insertAt(2, floorPlanDraggingTool);

    // Customizes resizing tool visuals
    myDiagram.toolManager.resizingTool.handleArchetype = FPTemplates.makeResizeHandle(5);
    myDiagram.toolManager.rotatingTool.handleArchetype = FPTemplates.makeResizeHandle(8);

    // Prevents copying a single wall point node
    myDiagram.commandHandler.canCopySelection = function () {
      if (myDiagram.selection.count === 1) {
        const part = myDiagram.selection.first();
        if (part && part instanceof go.Node) {
          if (part.category === 'wallPoint' || part.category === 'room') return false;
        }
      }
      return go.CommandHandler.prototype.canCopySelection.call(this);
    };

    // Ensures correct units
    updateUnits();

    // Loads the diagram
    load();
  } // end init

  // Handle view menu changes
  // Show/Hide dividers
  function updateDividerVisibility() {
    if (!(myDiagram instanceof go.Diagram)) return;
    myDiagram.links.each((link) => {
      if (link.category === 'divider') {
        const prev = myDiagram.skipsUndoManager;
        myDiagram.skipsUndoManager = true;
        link.visible = !$hideDividers;
        myDiagram.skipsUndoManager = prev;
      }
    });
  }

  // Show/Hide room areas
  function updateAreasVisibility() {
    if (!(myDiagram instanceof go.Diagram)) return;
    myDiagram.nodes.each((node) => {
      if (node.category === 'room') {
        const prev = myDiagram.skipsUndoManager;
        myDiagram.skipsUndoManager = true;
        const areaText = node.findObject('AREATEXT');
        if (areaText) areaText.visible = $showRoomAreas;
        myDiagram.skipsUndoManager = prev;
      }
    });
  }

  // Show/Hide measurements
  function updateMeasurementVisibility() {
    if (!(myDiagram instanceof go.Diagram)) return;
    myDiagram.links.each((link) => {
      if (link.category === 'measurement') {
        const prev = myDiagram.skipsUndoManager;
        myDiagram.skipsUndoManager = true;
        link.visible = !$hideMeasurements;
        myDiagram.skipsUndoManager = prev;
      }
    });
  }

  // Updates diagram and drag tool to use feet or meters
  function updateUnits() {
    const prev = myDiagram.skipsUndoManager;
    myDiagram.skipsUndoManager = true;
    myDiagram.updateAllTargetBindings();
    updateFloorData();
    myDiagram.grid = $useFeet ? FPTemplates.feetGrid : FPTemplates.meterGrid;
    const szx = FPTemplates.GRIDSNAPSIZE.width;
    const szy = FPTemplates.GRIDSNAPSIZE.height;
    const mult = $useFeet ? 1.52399995123 / 2 : 1;
    const dragTool = myDiagram.toolManager.findTool(
      'FloorPlanDraggingTool'
    )! as FloorPlanDraggingTool;
    dragTool.gridSnapCellSize = new go.Size(szx * mult, szy * mult);
    myDiagram.skipsUndoManager = prev;
    localStorage.setItem('lastUsedUnit', $useFeet ? 'feet' : 'meters');
  }

  function diagramContextMenuPred(menu: go.Adornment, e: go.DiagramEvent): boolean {
    const selection = e.diagram.selection.iterator;
    let count = 0;
    while (selection.next() && count < 3) {
      if (selection.value instanceof go.Node && selection.value.category === 'wallPoint') {
        count++;
      }
    }
    return count > 2;
  }

  const diagramContextMenu = (go.GraphObject.build('ContextMenu') as go.Adornment).add(
    FPTemplates.createContextMenuButton(
      'Create Room',
      (e: go.DiagramEvent, foo: null) => FPUtils.createRoom(myDiagram, setShowInvalidRoomAlert),
      diagramContextMenuPred
    )
  );

  function setShowInvalidRoomAlert(bool: boolean) {
    showingInvalidRoomAlert = bool;
  }

  // Called via the page component to activate and deactivate the wall builder tool
  function enableWallBuilding() {
    (myDiagram.toolManager.findTool('WallBuilder')! as WallBuilderTool).isEnabled = true;
    buildWalls();
  }

  function disableWallBuilding() {
    const tool = myDiagram.toolManager.findTool('WallBuilder')!;
    tool.stopTool();
    tool.isEnabled = false;
  }

  // Sets the builder tool's build type to walls, dividers, called from page
  function buildWalls() {
    (myDiagram.toolManager.findTool('WallBuilder')! as WallBuilderTool).buildType = 'wall';
  }

  function buildDividers() {
    (myDiagram.toolManager.findTool('WallBuilder')! as WallBuilderTool).buildType = 'divider';
  }

  function buildMeasurement() {
    (myDiagram.toolManager.findTool('WallBuilder')! as WallBuilderTool).buildType = 'measurement';
  }

  // Gets data from selected parts and passes them to the floor info section via runes
  // Called on selection changed listener
  function handleSelectionChangedData(e: go.DiagramEvent) {
    let UNIT = $useFeet ? 'ft' : 'm';
    let GRIDSCALE = $useFeet ? 15.2399995123 : 50;
    if (e.subject.count == 0) {
      // Nothing selected, don't display data in selected column
      selectedObject = null;
    } else if (e.subject.count === 1) {
      const node = e.subject.first();
      let data: Object;
      // Format data by selected type
      switch (node.category) {
        case 'wallPoint':
          data = {
            Type: 'Wall Point',
            Location: node.data.loc,
            Walls: node.findLinksConnected().count
          };
          selectedObject = data;
          break;
        case 'room':
          FPUtils.updateRoomArea(node);
          data = {
            Type: 'Room',
            'Room Name': node.data.text,
            Area:
              String(Math.round((node.data.area / GRIDSCALE ** 2) * 100) / 100) +
              ' ' +
              UNIT +
              '\u00B2'
          };
          selectedObject = data;
          break;
        case 'wallPart':
          const typeName = node.data.type;
          const typeFormatted = typeName.slice(0, 1).toUpperCase() + typeName.slice(1);
          data = {
            Type: typeFormatted,
            Location:
              String(Math.round(node.location.x * 100) / 100) +
              ', ' +
              String(Math.round(node.location.y * 100) / 100),
            Length: String(go.Size.parse(node.data.size).width / GRIDSCALE) + ' ' + UNIT,
            'Wall Key': node.data.linkKey
          };
          selectedObject = data;
          break;
        default:
          data = {
            Type: node.data.caption,
            Location:
              String(Math.round(node.location.x * 100) / 100) +
              ', ' +
              String(Math.round(node.location.y * 100) / 100),
            Size:
              String(Math.round((node.data.width / GRIDSCALE) * 100) / 100) +
              UNIT +
              ' x ' +
              String(Math.round((node.data.height / GRIDSCALE) * 100) / 100) +
              UNIT
          };
          selectedObject = data;
          break;
      }
    } else if (e.subject.count === 3) {
      // Handle selection of an individual link, first check if it is one
      let node1: go.Node | null = null;
      let node2: go.Node | null = null;
      let link: go.Link | null = null;
      let isDivider: boolean = false;
      let isMeasurement: boolean = false;
      e.subject.each((part: any) => {
        if (part.category === 'wallLink') {
          link = part;
        } else if (part.category === 'divider') {
          link = part;
          isDivider = true;
        } else if (part.category === 'measurement') {
          link = part;
          isMeasurement = true;
        } else if (part.category === 'wallPoint') {
          if (!node1) {
            node1 = part;
          } else if (!node2) {
            node2 = part;
          }
        }
      });
      // Verify there is one link and two wall point nodes on either end
      link = link ? (link as go.Link) : null;
      node1 = node1 ? (node1 as go.Node) : null;
      node2 = node2 ? (node2 as go.Node) : null;
      if (link && link.fromNode && link.toNode && node1 && node2) {
        if (
          (link.fromNode === node1 || link.toNode === node1) &&
          (link.fromNode === node2 || link.toNode === node2)
        ) {
          const length = Math.sqrt(node1.location.distanceSquaredPoint(node2.location));
          let data;
          // Set data by link type
          if (isDivider) {
            data = {
              Type: 'Divider',
              Length: String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT
            };
          } else if (isMeasurement) {
            data = {
              Type: 'Measurement',
              Length: String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT
            };
          } else {
            data = {
              Type: 'Wall',
              Length: String(Math.round((length / GRIDSCALE) * 100) / 100) + ' ' + UNIT,
              Thickness: String(Math.round((link.data.width / GRIDSCALE) * 100) / 100) + ' ' + UNIT
            };
          }
          selectedObject = data;
        }
      }
    }
    // Recheck and update floor data
    updateFloorData();
  }

  // Updates floor data in node info page
  function updateFloorData() {
    let UNIT = $useFeet ? 'ft' : 'm';
    let GRIDSCALE = $useFeet ? 15.2399995123 : 50;
    let roomCount = 0;
    let bathroomCount = 0;
    let bedroomCount = 0;
    let itemCount = 0;
    let windowCount = 0;
    let doorCount = 0;
    let totalArea = 0;
    let wallCount = 0;
    myDiagram.nodes.each((node: go.Node) => {
      if (node.category === 'room') {
        if (node.data.text.toLowerCase().includes('bathroom')) bathroomCount++;
        if (node.data.text.toLowerCase().includes('bedroom')) bedroomCount++;
        roomCount++;
        totalArea += node.data.area;
      } else if (node.category === 'wallPart' && node.data.type === 'window') {
        windowCount++;
      } else if (node.category === 'wallPart' && node.data.type === 'door') {
        doorCount++;
      } else if (node.category === '') {
        itemCount++;
      }
    });
    myDiagram.links.each((link: go.Link) => {
      if (link.category === 'wallLink') wallCount++;
    });
    floorData = {
      Rooms: roomCount,
      Area: String(Math.round((totalArea / GRIDSCALE ** 2) * 100) / 100) + ' ' + UNIT + '\u00B2',
      Walls: wallCount,
      Bedrooms: bedroomCount,
      Bathrooms: bathroomCount,
      Windows: windowCount,
      Doors: doorCount,
      'Furniture/Utilities/Other': itemCount
    };
  }

  // If viewing saved model, save the current model, if viewing the example, just update the JSON viewer
  function save() {
    const modelToSave = myDiagram.model.toJson();
    if (viewing === 'example') {
      model = modelToSave;
    } else {
      model = modelToSave;
      localStorage.setItem('savedFloorPlanModel', modelToSave);
      localStorage.setItem('lastViewedModel', 'saved');
    }
  }
  // Loads model, miters points, moves wall parts, updates floor data, zooms to fit diagram
  function load(loadSaved?: boolean) {
    if (!(myDiagram instanceof go.Diagram)) return;
    if (loadSaved === true) {
      // Load saved model if it exists
      const saved = localStorage.getItem('savedFloorPlanModel');
      if (saved) {
        myDiagram.model = go.Model.fromJson(saved);
        model = saved;
        localStorage.setItem('lastViewedModel', 'saved');
        viewing = 'saved';
      } else {
        // No saved model, loads blank model
        model = FPTemplates.blankModel;
        myDiagram.model = go.Model.fromJson(model);
        localStorage.setItem('lastViewedModel', 'example');
        viewing = 'saved';
      }
    } else if (loadSaved === false) {
      // Load example model
      myDiagram.model = go.Model.fromJson(exampleModel);
      model = exampleModel;
      localStorage.setItem('lastViewedModel', 'example');
      viewing = 'example';
    } else {
      // loadSaved is not provided, load the current JSON from the text area
      myDiagram.model = go.Model.fromJson(model);
      if (model === exampleModel) {
        localStorage.setItem('lastViewedModel', 'example');
        viewing = 'example';
      }
    }
    // Set copy functions for nodes and links, handle copy function added to diagram listener
    myDiagram.model.copyNodeDataFunction = (data: go.ObjectData, model: go.Model) => {
      const dataCopy: any = {};
      for (const o in data) {
        if (Array.isArray(data[o])) {
          dataCopy[o] = data[o].slice();
        } else {
          dataCopy[o] = data[o];
        }
      }
      if (String(dataCopy.key).slice(0, 3) === 'pal') {
        // If dragged from the palette, delete the palette key and let a new one be generated
        delete dataCopy.key;
      } else {
        // If not from the palette, include reference to original's key
        dataCopy['copiedFrom'] = data.key;
      }
      return dataCopy;
    };
    (myDiagram.model as go.GraphLinksModel).copyLinkDataFunction = (
      data: go.ObjectData,
      model: go.GraphLinksModel
    ) => {
      const dataCopy: any = {};
      for (const o in data) {
        if (Array.isArray(data[o])) {
          dataCopy[o] = data[o].slice();
        } else {
          dataCopy[o] = data[o];
        }
      }
      dataCopy['copiedFrom'] = data.key;
      return dataCopy;
    };
    myDiagram.nodes.each((node) => {
      if (node.category === 'wallPoint') FPUtils.miterPoint(node);
      else if (node.category === 'wallPart') FPUtils.moveWallPart(node);
    });
    updateFloorData();
    // Handle menu checkbox options
    updateAreasVisibility();
    updateDividerVisibility();
    updateMeasurementVisibility();
    myDiagram.commandHandler.zoomToFit();
    // Clear undo manager so init and load changes can't be undone
    myDiagram.undoManager.clear();
  }

  // Prints diagram, fits it to one page
  function printDiagram() {
    const svgWindow = window.open();
    if (!svgWindow) return; // failure to open a new Window

    svgWindow.document.title = 'myFloorplan';
    const bnds = myDiagram.documentBounds;

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

    const svg = myDiagram.makeSvg({
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
</script>

<!-- HTML element containing the diagram, make full size when resizing info bar to prevent gaps or overlap -->
<div
  id="myDiagramDiv"
  class="{resizing ? 'h-screen' : 'h-full'} {resizing ? 'w-screen' : 'w-full'}"
  bind:this={diagramDiv}
></div>
