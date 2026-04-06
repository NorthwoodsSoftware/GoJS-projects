import * as go from 'gojs';
import { useGoStore } from '@/store';

export function isPerson(n: go.GraphObject): n is go.Node {
  return n !== null && n instanceof go.Node && n.category === '';
}

export function isTable(n: go.GraphObject): n is go.Node {
  return n !== null && n instanceof go.Node && n.category !== '';
}

function getTable(obj: go.GraphObject): go.Node | null {
  if (!obj.diagram) return null;
  let table: go.Node | null = null;
  if (isTable(obj)) {
    table = obj;
  } else if (isPerson(obj)) {
    // refer to the person's table instead
    table = obj.diagram.findNodeForKey(obj.data.table);
  }
  return table;
}

// Highlight the empty and occupied seats at a "Table" Node
export function highlightSeats(obj: go.GraphObject, coll: go.Iterable<go.Part>, show: boolean) {
  const table = getTable(obj);
  if (table === null || table.diagram === null) return;

  const it = coll.iterator;
  while (it.next()) {
    const n = it.key;
    // if dragging a Table, don't do any highlighting
    if (isTable(n)) return;
  }
  const guests = table.data.guests;
  const tm = table.diagram.themeManager;
  for (const sit = table.elements; sit.next(); ) {
    const seat = sit.value;
    if (!(seat instanceof go.Panel) || isNaN(seat.itemIndex)) continue;
    const num = seat.itemIndex + 1;
    const seatshape = seat.findObject('SEATSHAPE') as go.Shape;
    if (!seatshape) continue;
    let tv;
    if (show) {
      if (guests && guests[num]) {
        tv = tm.findValue('colors.error');
      } else {
        tv = tm.findValue('colors.success');
      }
    } else {
      tv = tm.findValue('colors.borderAccented');
    }
    // convert theme value to CSS color;
    // this is handled automatically for theme bindings, but not when setting a property
    seatshape.stroke = getComputedStyle(document.documentElement).getPropertyValue(tv.match(/var\((.*)\)/)[1]);
  }
}

// Given a "Table" Node, assign seats for all of the people in the given collection of Nodes;
// the optional Point argument indicates where the collection of people may have been dropped.
export function assignPeopleToSeats(obj: go.GraphObject, coll: go.Set<go.Part>, pt: go.Point) {
  const table = getTable(obj);
  if (table === null || table.diagram === null) return;

  if (coll.any(isTable)) {
    // if dragging a Table, don't allow it to be dropped onto another table
    table.diagram.currentTool.doCancel();
    return;
  }
  // OK -- all Nodes are people, call assignSeat on each person data
  coll.each((n) => assignSeat(table, n.data, pt));
  positionPeopleAtSeats(table);
}

// Given a "Table" Node, assign one guest data to a seat at that table.
// This tries to assign the unoccupied seat that is closest to the given point in document coordinates.
function assignSeat(node: go.Node, guest: go.ObjectData, pt: go.Point) {
  const table = getTable(node);
  if (table === null || table.diagram === null) return;
  if (guest instanceof go.GraphObject) throw Error('A guest object must not be a GraphObject');
  if (!(pt instanceof go.Point)) pt = node.location;

  // in case the guest used to be assigned to a different seat, perhaps at a different table
  unassignSeat(table.diagram, guest);

  const model = table.diagram.model;
  if (!table.data.guests) model.setDataProperty(node.data, 'guests', {});
  const guests = table.data.guests;
  // iterate over all seats in the Node to find one that is not occupied
  const closestseatname = findClosestUnoccupiedSeat(table, pt);
  if (closestseatname) {
    model.setDataProperty(guests, closestseatname, guest.key);
    model.setDataProperty(guest, 'table', table.data.key);
    model.setDataProperty(guest, 'seat', parseFloat(closestseatname));
  }
}

// Declare that the guest represented by the data is no longer assigned to a seat at a table.
// If the guest had been at a table, the guest is removed from the table's list of guests.
export function unassignSeat(diagram: go.Diagram, guest: go.ObjectData) {
  if (guest instanceof go.GraphObject) throw Error('A guest object must not be a GraphObject');
  const model = diagram.model;
  // remove from any table that the guest is assigned to
  if (guest.table) {
    const table = model.findNodeDataForKey(guest.table);
    if (table) {
      const guests = table.guests;
      if (guests) model.setDataProperty(guests, guest.seat.toString(), undefined);
    }
  }
  model.setDataProperty(guest, 'table', undefined);
  model.setDataProperty(guest, 'seat', undefined);
}

// Given a "Table" Node, unassign all guests seated there.
export function unassignAllSeats(diagram: go.Diagram, guests: go.ObjectData) {
  const model = diagram.model;
  for (const seat in guests) {
    const guest = model.findNodeDataForKey(guests[seat]);
    if (!guest) continue;
    model.setDataProperty(guest, 'table', undefined);
    model.setDataProperty(guest, 'seat', undefined);
  }
}

// Find the name of the unoccupied seat that is closest to the given Point.
// This returns null if no seat is available at this table.
function findClosestUnoccupiedSeat(node: go.Node, pt: go.Point) {
  const table = getTable(node);
  if (table === null || table.diagram === null) return;

  const guests = table.data.guests;
  let closestseatname = null;
  let closestseatdist = Infinity;
  // iterate over all seats in the Node to find one that is not occupied
  for (const sit = table.elements; sit.next(); ) {
    const seat = sit.value;
    if (!(seat instanceof go.Panel) || isNaN(seat.itemIndex)) continue;
    const num = seat.itemIndex + 1;
    if (guests && guests[num]) continue; // already assigned
    const seatloc = seat.getDocumentPoint(go.Spot.Center);
    const seatdist = seatloc.distanceSquaredPoint(pt);
    if (seatdist < closestseatdist) {
      closestseatdist = seatdist;
      closestseatname = num.toString();
    }
  }
  return closestseatname;
}

// Position the nodes of all of the guests that are seated at this table
// to be at their corresponding seat elements of the given "Table" Node.
export function positionPeopleAtSeats(node: go.Part) {
  const table = getTable(node);
  if (table === null || table.diagram === null) return;

  const guests = table.data.guests;
  const model = table.diagram.model;
  for (const seatname in guests) {
    const guestkey = guests[seatname];
    const guestdata = model.findNodeDataForKey(guestkey);
    if (guestdata) positionPersonAtSeat(table, guestdata);
  }
}

// Position a single guest Node to be at the location of the seat to which they are assigned.
function positionPersonAtSeat(node: go.Node, guest: go.ObjectData) {
  const table = getTable(node);
  if (table === null || table.diagram === null) return;
  if (guest instanceof go.GraphObject) throw Error('A guest object must not be a GraphObject');
  if (!guest || !guest.table || !guest.seat) return;

  const goStore = useGoStore();

  const person = table.diagram.findPartForData(guest);
  if (table && table.itemArray && person) {
    if (guest.seat > table.itemArray.length) {
      unassignSeat(table.diagram, guest);
      // remove from main diagram, readd to Guests diagram
      goStore.deleteNodeData(guest.key);
      goStore.createNodeData(guest, true);
    }
    const seat = table.findItemPanelForData(table.itemArray[guest.seat - 1]);
    if (!seat) return;
    const loc = seat.getDocumentPoint(go.Spot.Center);
    person.location = loc;
  }
}
