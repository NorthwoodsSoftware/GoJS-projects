import go from 'gojs';

// Contains the template and geometries for furniture nodes which is the default node category
export const TemplateGeometries: Record<string, string> = {
  sofaMedium:
    'F1 M 5 0 Q 0 0 0 3 V 35 Q 0 40 5 40 H 75 Q 80 40 80 35 V 3 Q 80 0 75 0 Q 70 0 70 3 V 29 Q 40 25 10 29 V 3 Q 10 0 5 0 M 13 0 H 37 Q 40 1 40 5 V 27 Q 25 27 10 29 V 3 M 10 29 Q 8 29 6 32 M 70 29 Q 72 29 74 32 Q 72 29 70 29 M 40 5 Q 40 1 43 0 H 67 Q 69 0 70 3 L 70 29 Q 55 27 40 27 M 13 0 Q 11 0 10 3',
  armChair:
    'F1 M 4 0 Q 0 0 0 3 V 35 Q 0 40 5 40 H 35 Q 40 40 40 35 V 3 Q 40 0 36 0 Q 32 0 32 3 V 29 Q 20 27 8 29 V 3 Q 8 0 4 0 M 11 0 H 29 Q 31 0 32 3 M 8 29 Q 5 30 5 31 M 32 29 Q 35 30 35 31 Q 35 30 32 29 M 11 0 Q 9 0 8 3 L 8 29 Q 20 27 32 29 V 3',
  diningTable:
    'F1 M 0 0 L 0 100 200 100 200 0 0 0 M 25 0 L 25 -10 75 -10 75 0 M 125 0 L 125 -10 175 -10 175 0 M 200 25 L 210 25 210 75 200 75 M 125 100 L 125 110 L 175 110 L 175 100 M 25 100 L 25 110 75 110 75 100 M 0 75 -10 75 -10 25 0 25',
  stove:
    'F1 M 0 0 L 0 100 L 100 100 L 100 0 L 0 0 M 30 20 A 15 15 180 1 0 30.01 20 M 30 25 A 10 10 180 1 0 30.01 25 M 70 20 A 15 15 180 1 0 70.01 20 M 70 25 A 10 10 180 1 0 70.01 25 M 20 65 A 1 1 0 0 0 20 85 A 1 1 0 0 0 20 65 M 80 65 A 1 1 0 0 0 80 85 A 1 1 0 0 0 80 65 M 41 70 H 63 M 37 75 H 63 M 45 80 H 63 M 0 10 H 100',
  toilet:
    'F1 M0 0 L25 0 25 10 0 10 0 0 M20 10 L20 15 5 15 5 10 20 10 M5 15 Q0 15 0 25 Q0 40 12.5 40 Q25 40 25 25 Q25 15 20 15',
  shower:
    'F1 M0 0 L40 0 40 60 0 60 0 0 M35 15 L35 55 5 55 5 15 Q5 5 20 5 Q35 5 35 15 M22.5 20 A2.5 2.5 180 1 1 22.5 19.99',
  doubleSink:
    'F1 M0 0 L75 0 75 40 0 40 0 0 M5 7.5 L35 7.5 35 35 5 35 5 7.5 M44 7.5 L70 7.5 70 35 40 35 40 9M15 21.25 A5 5 180 1 0 15 21.24 M50 21.25 A 5 5 180 1 0 50 21.24 M40.5 3.75 A3 3 180 1 1 40.5 3.74M40.5 3.75 L50.5 13.75 47.5 16.5 37.5 6.75 M32.5 3.75 A 1 1 180 1 1 32.5 3.74 M 27.5 4.25 L 27.5 3.25 30.5 3.25M 30.5 4.25 L 27.5 4.25 M44.5 3.75 A 1 1 180 1 1 44.5 3.74 M 44.35 3.25 L 47.5 3.25 47.5 4.25 M 44.35 4.25 L 47.5 4.25',
  sink: 'F1 M0 0 L40 0 40 40 0 40 0 0z M5 7.5 L18.5 7.5 M 21.5 7.5 L35 7.5 35 35 5 35 5 7.5 M 15 21.25 A 5 5 180 1 0 15 21.24M23 3.75 A 3 3 180 1 1 23 3.74 M21.5 6.25 L 21.5 12.5 18.5 12.5 18.5 6.25 M15 3.75 A 1 1 180 1 1 15 3.74M 10 4.25 L 10 3.25 13 3.25 M 13 4.25 L 10 4.25 M27 3.75 A 1 1 180 1 1 27 3.74 M 26.85 3.25 L 30 3.25 30 4.25 M 26.85 4.25 L 30 4.25',
  staircase:
    'F1 M0 0 L 0 100 250 100 250 0 0 0 M25 100 L 25 0 M 50 100 L 50 0 M 75 100 L 75 0M 100 100 L 100 0 M 125 100 L 125 0 M 150 100 L 150 0 M 175 100 L 175 0 M 200 100 L 200 0 M 225 100 L 225 0',
  bed: 'F1 M 2 3 H 38 Q 40 3 40 5 V 58 Q 40 60 38 60 H 2 Q 0 60 0 58 V 5 Q 0 3 2 3 M 0 20 H 40 M 0 25 H 40 M 0 0 H 40 V 2 L 38 3 M 0 0 V 2 L 2 3 L 38 3 X M 5 5 Q 3 5 3 6 V 16 Q 3 17 5 17 H 17.5 Q 19.5 17 19.5 16 V 6 Q 19.5 5 17.5 5 H 5 M 23 5 Q 20.5 5 20.5 6 V 16 Q 20.5 17 23 17 H 35 Q 37 17 37 16 V 6 Q 37 5 35 5 H 23',
  stairs: 'F1 M 0 0 H 20 V 40 H 0 V 0 M 0 4 H 20 M 0 8 H 20 M 0 12 H 20 M 0 16 H 20 M 0 20 H 20 M 0 24 H 20 M 0 28 H 20 M 0 32 H 20 M 0 4 H 20 M 0 36 H 20'
};

export const DefaultNode = new go.Node('Spot', {
  layerName: 'Foreground',
  zOrder: 1,
  resizable: true,
  rotatable: true,
  locationObjectName: 'SHAPE',
  resizeObjectName: 'SHAPE',
  rotateObjectName: 'SHAPE',
  minSize: new go.Size(5, 5),
  locationSpot: go.Spot.Center,
  selectionAdornmentTemplate:
    new go.Adornment('Auto')
      .add(
        new go.Shape('Rectangle', {
          fill: null,
          stroke: 'skyblue',
          strokeWidth: 2
        }),
        new go.Placeholder({ padding: 0 })
      ),
  // Ignores the grid snap when shift is held or when other objects are selected
  dragComputation: (thisPart: go.Part, pt: go.Point, gridpt: go.Point) => {
    if (thisPart.diagram!.lastInput.shift) return pt;
    return gridpt;
  },
  mouseEnter: (e: go.InputEvent, thisObj: go.GraphObject) => {
    e.diagram.commit(() => {
      if (!(thisObj instanceof go.Node)) return;
      const shape = thisObj.findObject('SHAPE');
      if (!(shape && shape instanceof go.Shape)) return;
      shape.fill = 'rgba(0, 0, 0, 0.05)';
    }, null)
  },
  mouseLeave: (e: go.InputEvent, thisObj: go.GraphObject) => {
    e.diagram.commit(() => {
      if (!(thisObj instanceof go.Node)) return;
      const shape = thisObj.findObject('SHAPE');
      if (!(shape && shape instanceof go.Shape)) return;
      shape.fill = 'rgba(0, 0, 0, 0.02)';
    }, null)
  }
})
  // remember Node location
  .bindTwoWay('location', 'loc', go.Point.parse, go.Point.stringify)
  // move selected Node to Foreground layer so it's not obscured by non-selected Parts
  .bindObject('layerName', 'isSelected', function (s) {
    return s ? 'Foreground' : '';
  })
  .add(
    // Primary node shape
    new go.Shape('Ellipse', {
      name: 'SHAPE',
      stroke: '#000000',
      strokeWidth: 0.5,
      fill: 'rgba(0, 0, 0, 0.02)'
    })
      .bind('geometryString', 'geoType', (type: string) => {
        if (TemplateGeometries[type] !== undefined) return TemplateGeometries[type];
        return undefined;
      })
      .bindTwoWay('figure', 'shape')
      .bindTwoWay('width')
      .bindTwoWay('height')
      .bindTwoWay('angle'),

    // Label
    new go.Panel('Auto', {
      visible: false
    })
      .bind('visible', 'showLabel')
      .add(
        new go.Shape('RoundedRectangle', { fill: 'beige', opacity: 0.5, stroke: null }),
        new go.TextBlock({
          margin: 5,
          wrap: go.Wrap.Fit,
          textAlign: 'center',
          editable: true,
          isMultiline: false,
          stroke: 'black',
          font: '10pt sans-serif'
        })
          .bindTwoWay('text')
          .bindTwoWay('angle', 'angle')
          .bind('font', 'height', function (height) {
            if (height > 25) {
              return '10pt sans-serif';
            }
            if (height < 25 && height > 15) {
              return '8pt sans-serif';
            } else {
              return '6pt sans-serif';
            }
          })
      )
  );

  export const paletteNodeTemplateMap = new go.Map<string, go.Node>();
  paletteNodeTemplateMap.add('', DefaultNode);