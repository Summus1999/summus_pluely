/**
 * Theme-related types for the application
 */

/**
 * Available theme modes
 */
export type Theme = "dark" | "light" | "system";

/**
 * Props for the ThemeProvider component
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

/**
 * State provided by the ThemeContext
 */
export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  transparency: number;
  onSetTransparency: (transparency: number) => void;
  isSystemThemeDark: boolean;
}
