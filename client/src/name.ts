const STORAGE_KEY = "circle-display-name";

export function getDisplayName(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setDisplayName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name.trim());
}

export function clearDisplayName(): void {
  localStorage.removeItem(STORAGE_KEY);
}
