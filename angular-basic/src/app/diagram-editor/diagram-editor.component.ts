import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material';
import * as go from 'gojs';

import { GuidedDraggingTool } from './GuidedDraggingTool';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-diagram-editor',
  templateUrl: './diagram-editor.component.html',
  styleUrls: ['./diagram-editor.component.css']
})
export class DiagramEditorComponent implements OnInit {
  private diagram: go.Diagram = new go.Diagram();
  private palette: go.Palette = new go.Palette();

  @ViewChild('diagramDiv')
  private diagramRef: ElementRef;

  @ViewChild('paletteDiv')
  private paletteRef: ElementRef;

  @Input()
  get model(): go.Model { return this.diagram.model; }
  set model(val: go.Model) { this.diagram.model = val; }

  @Output()
  nodeSelected = new EventEmitter<go.Node|null>();

  @Output()
  modelChanged = new EventEmitter<go.ChangedEvent>();

  constructor(public dialog: MatDialog) {
    const $ = go.GraphObject.make;
    // Place GoJS license key here:
    // (go as any).licenseKey = "..."
    this.diagram = new go.Diagram();
    this.diagram.initialContentAlignment = go.Spot.Center;
    this.diagram.allowDrop = true;
    this.diagram.undoManager.isEnabled = true;
    this.diagram.toolManager.draggingTool = new GuidedDraggingTool();
    this.diagram.addDiagramListener("ChangedSelection",
        e => {
          const node = e.diagram.selection.first();
          this.nodeSelected.emit(node instanceof go.Node ? node : null);
        });
    this.diagram.addModelChangedListener(e => e.isTransactionFinished && this.modelChanged.emit(e));

    this.diagram.nodeTemplate =
      $(go.Node, "Auto",
        {
          click: (e, node: go.Node) => { this.openDialog(node.data); }
        },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape,
          {
            fill: "white", strokeWidth: 0,
            portId: "", cursor: "pointer",
            // allow many kinds of links
            fromLinkable: true, toLinkable: true,
            fromLinkableSelfNode: true, toLinkableSelfNode: true,
            fromLinkableDuplicates: true, toLinkableDuplicates: true
          },
          new go.Binding("fill", "color")),
        $(go.TextBlock,
          { margin: 8 /*, editable: true*/ },
          new go.Binding("text")/*.makeTwoWay()*/)
      );

    this.diagram.linkTemplate =
      $(go.Link,
        // allow relinking
        { relinkableFrom: true, relinkableTo: true },
        $(go.Shape),
        $(go.Shape, { toArrow: "OpenTriangle" })
      );

    this.palette = new go.Palette();
    this.palette.nodeTemplateMap = this.diagram.nodeTemplateMap;

    // initialize contents of Palette
    this.palette.model.nodeDataArray =
      [
        { text: "Alpha", color: "lightblue" },
        { text: "Beta", color: "orange" },
        { text: "Gamma", color: "lightgreen" },
        { text: "Delta", color: "pink" },
        { text: "Epsilon", color: "yellow" }
      ];
  }

  ngOnInit() {
    this.diagram.div = this.diagramRef.nativeElement;
    this.palette.div = this.paletteRef.nativeElement;
  }

  openDialog(data: any): void {
    const dialogRef = this.dialog.open(ModalComponent, {
      width: '250px',
      data: { key: data.key, text: data.text, color: data.color }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.diagram.model.commit(function(m) {
          m.set(data, "text", result.text);
          m.set(data, "color", result.color);
        }, "modified node properties");
      }
    });
  }
}
