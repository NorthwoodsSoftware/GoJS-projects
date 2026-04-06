# gojs-json editor

## By Northwoods Software for [GoJS](https://gojs.net)

This project provides an example of using GoJS Diagrams within a Svelte app. This interactive tool lets you edit JSON data with a GoJS diagram that updates live to visualize your data.

This app is built using [Svelte 5](https://svelte.dev/) for the UI, [GoJS](https://gojs.net) for the interactive diagram, and the [Monaco Editor](https://github.com/microsoft/monaco-editor) for the JSON text editor.

Internally the data is actually stored as a list of key/value pairs, not as an object. When changes are made to the data through the editor on the left, or through the modal, they first go to this data structure which acts as the "single source of truth". From there changes are propogated to other parts of the program to stay in sync.

## Installation

Start by running `npm install` to install all necessary dependencies.
`npm run dev` runs the app in the development mode.

## [Project source code](https://github.com/NorthwoodsSoftware/gojs-projects)

## [See more GoJS Samples](https://gojs.net/latest/samples/)
