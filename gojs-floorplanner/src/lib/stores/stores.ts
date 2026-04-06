import { writable } from "svelte/store";

// Store global settings aviable to users in the options menu
export const useFeet = writable<boolean>(false);
export const showRoomAreas = writable<boolean>(true);
export const hideDividers = writable<boolean>(true);
export const hideMeasurements = writable<boolean>(false);