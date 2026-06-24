// Lightweight theme controller — no DB, no provider. The user's choice lives in
// localStorage under `theme`; the resolved light/dark value is reflected as a
// `dark` class on <html>. A matching inline bootstrap script in the root layout
// applies the same logic before first paint to avoid a flash.

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

/** Dispatched on <window> after the choice changes (same-document signal —
 * the native `storage` event only fires in *other* tabs). */
export const THEME_EVENT = "themechange";

const isBrowser = () => typeof window !== "undefined";

function systemPrefersDark(): boolean {
  return isBrowser() && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** The user's stored preference (defaults to following the system). */
export function getStoredTheme(): ThemeChoice {
  if (!isBrowser()) return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

/** Resolve a choice to the concrete theme that should be rendered. */
export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "system") return systemPrefersDark() ? "dark" : "light";
  return choice;
}

/** Persist the choice and reflect it on <html> immediately. */
export function setTheme(choice: ThemeChoice): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, choice);
  document.documentElement.classList.toggle("dark", resolveTheme(choice) === "dark");
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Keep the `dark` class in sync with the OS when the user is on "system".
 * Returns an unsubscribe function. No-op on the server.
 */
export function watchSystemTheme(): () => void {
  if (!isBrowser()) return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getStoredTheme() === "system") {
      document.documentElement.classList.toggle("dark", mql.matches);
    }
  };
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
