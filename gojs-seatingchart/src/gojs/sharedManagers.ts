import * as go from 'gojs';

export const undoManager = new go.UndoManager({ isEnabled: true });

export const themeManager = new go.ThemeManager({
  changesDivBackground: false, // transparent, handled by body changing
  readsCssVariables: true,
  themeMap: new go.Map([
    {
      key: 'light',
      value: {
        ...go.Themes.Light,
        colors: {
          selection: 'var(--ui-secondary)',
          primary: 'var(--ui-primary)',
          secondary: 'var(--ui-secondary)',
          success: 'var(--ui-success)',
          info: 'var(--ui-info)',
          warning: 'var(--ui-warning)',
          error: 'var(--ui-error)',
          text: 'var(--ui-text)',
          bg: 'var(--ui-bg)',
          bgMuted: 'var(--ui-bg-muted)',
          bgAccented: 'var(--ui-bg-accented)',
          border: 'var(--ui-border)',
          borderMuted: 'var(--ui-border-muted)',
          borderAccented: 'var(--ui-border-accented)'
        }
      }
    }
  ])
});
