# GoJS Collaborate

### By Northwoods Software for [GoJS](https://gojs.net)

This sample demonstrates collaborative GoJS Diagrams in a real time multiplayer Svelte app using YJS.

Multiple users can view and edit the Diagram simultaneously, with changes being synced between all connected clients. The position of each users cursor and the area they are currently selecting will be visible to all users. Additionally each client can see every one elses selected Parts.

When a Node or Link is selected a mini cursor with the users unique color will appear and point to it. Multiple users can select the same objects, in this case multiple of these cursors will point to the Part.

## Installation

Start by running `npm install` to install all necessary dependencies.
`npm run dev` runs the app in the development mode.

## How it Works

Both Diagrams exist independently from one another with their own Model data, Node data array, and Link data array. Each also contains a Y Document which also contains it's own Node and Link data arrays.

When client 1 makes a change to their Diagram that will change the Diagram.model. Then these changes will be replicated into client 1's Y document. From there the changes to the Y document are serialized and synced with other Y documents either locally or over the internet.

When client 2's Y document sees the changes from client 1, client 2's Y document will update. Then the changes will be replicated into client 2's Diagram.model.

## Additional Notes

This project does nothing special to handle the UndoManager though for your own project you likely will want to.

Currently all changes from other clients will skip the UndoManager, and changes from the current client will not. This way when client 1 performs an undo it will always undo their last action.

This comes with a downside that if client 1 moves a Node, then client 2 moves the same Node. If client 1 now performs an undo will move back to the position it was at before client 1 initially moved it, effectively undoing both client 1's and client 2's changes.

For most cases what you would want is to make a custom Model only UndoManager since the only changes that get propagated between clients come from the Diagram.model. Then keep track of who last modifies each property within Node.data and Link.data. When a user now performs an undo or redo, filter through the Transaction.changes and remove any changes to properties that have been modified by other clients since the client performing the undo initially made their change.

## [Project source code](https://github.com/NorthwoodsSoftware/gojs-projects)

## [See more GoJS Samples](https://gojs.net/latest/samples/)
