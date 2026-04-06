import * as go from 'gojs';

// Themed Tooltip
go.GraphObject.defineBuilder('ThemedToolTip', () =>
  new go.Adornment('Auto', {
    isShadowed: true,
    shadowColor: 'rgba(0, 0, 0, .4)',
    shadowOffset: new go.Point(0, 2)
  }).add(
    new go.Shape('RoundedRectangle', {
      name: 'Border',
      parameter1: 5,
      strokeWidth: 0,
      spot1: new go.Spot(0, 0, 4, 6),
      spot2: new go.Spot(1, 1, -4, -4)
    }).theme('fill', 'bgMuted')
  )
);

// Align the tooltip based on the adorned object's viewport bounds
function toolTipAlignConverter(obj: go.GraphObject, tt: go.Adornment) {
  const d = obj.diagram;
  if (!d) return;
  const bot = obj.getDocumentPoint(go.Spot.Bottom);
  const viewPt = d.transformDocToView(bot).offset(0, 35);
  // if tooltip would be below viewport, show above instead
  const align = d.viewportBounds.height >= viewPt.y / d.scale ? new go.Spot(0.5, 1, 0, 6) : new go.Spot(0.5, 0, 0, -6);

  tt.alignment = align;
  tt.alignmentFocus = align.y === 1 ? go.Spot.Top : go.Spot.Bottom;
}

// a tooltip for Guest nodes
export const toolTip = new go.Adornment(go.Panel.Spot).add(
  new go.Placeholder(),
  new go.Panel(go.Panel.Auto)
    .add(
      new go.Shape('RoundedRectangle', { strokeWidth: 1 }).theme('fill', 'bg').theme('stroke', 'borderAccented'),
      new go.TextBlock({ margin: new go.Margin(3, 12) }).bind('text', 'name').theme('stroke', 'text')
    )
    // sets alignment and alignmentFocus based on adorned object's position in viewport
    .bindObject('', 'adornedObject', toolTipAlignConverter)
);

// Rotation Adornment
export const rotationAdornment = new go.Adornment({ locationSpot: go.Spot.Center }).add(
  new go.Shape({
    width: 16,
    height: 16,
    cursor: 'pointer',
    background: 'transparent',
    strokeWidth: 2,
    strokeCap: 'round',
    geometryString: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5'
  }).theme('stroke', 'secondary')
);
