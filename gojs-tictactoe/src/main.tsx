import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './ThemeContext';
import { MetaTags } from './components/MetaTags.tsx';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
    <MetaTags
      title="Interactive React Diagram with GoJS | GoJS Diagramming Library"
      description="Modify live state shared between React components and a GoJS diagram."
      projectTitle="gojs-tictactoe"
      screenshot="tictactoe.png"
      applicationCategory="DeveloperApplication"
    />
  </ThemeProvider>
);
