import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

// local storage is accessed here in addition to later so that the correct
// theme can be set earlier on in the page load process
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: (localStorage.getItem('colorTheme') as Theme) || 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let loadTheme: Theme = 'light';
    if (localStorage.getItem('colorTheme')) {
      loadTheme = localStorage.getItem('colorTheme') as Theme;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      loadTheme = 'dark';
    }

    // initialize the theme from local storage or system theme
    setTheme(() => loadTheme);
  }, []); // empty list to run this once on mount

  // this is not inside of an effect so that it will run before children try to access the new theme
  document.documentElement.classList.toggle('dark', theme === 'dark');

  // update stored theme
  useEffect(() => {
    localStorage.setItem('colorTheme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
