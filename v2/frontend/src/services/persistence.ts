import type { SaveFile } from '../../../shared/types';
import { validateSaveFile } from '../schemas/savefile';
import { SAVEFILE_STORAGE_KEY } from './migration';

export function loadFromLocalStorage(): SaveFile | null {
  const raw = localStorage.getItem(SAVEFILE_STORAGE_KEY);
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = validateSaveFile(parsed);
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(sf: SaveFile): void {
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(sf));
}

export function fingerprint(sf: SaveFile): string {
  return JSON.stringify(sf);
}

function timestampedFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const mo = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `bank-config-${y}${mo}${d}-${h}${mi}${s}.json`;
}

export function exportToFile(sf: SaveFile): void {
  const blob = new Blob([JSON.stringify(sf, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = timestampedFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<SaveFile> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON: ${(err as Error).message}`);
  }
  const result = validateSaveFile(parsed);
  if (!result.ok) {
    throw new Error(`Invalid save file: ${result.error}`);
  }
  return result.data;
}
