import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Handles light and dark themes, can be switched between in the view menu

// get the default theme
let isDark = false;
if (browser) {
  if (localStorage.getItem('colorTheme')) {
    isDark = localStorage.getItem('colorTheme') === 'dark';
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

export const currentTheme = writable<'light' | 'dark'>(isDark ? 'dark' : 'light');

currentTheme.subscribe(theme => {
  // set light and dark on the document body for tailwind
  if (browser) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('colorTheme', theme);
  }
});