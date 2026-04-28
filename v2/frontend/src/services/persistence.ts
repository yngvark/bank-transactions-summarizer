import type { SaveFile } from '../../../shared/types';
import { validateSaveFile } from '../schemas/savefile';
import { SAVEFILE_STORAGE_KEY } from './boot';

export function saveToLocalStorage(sf: SaveFile): void {
  localStorage.setItem(SAVEFILE_STORAGE_KEY, JSON.stringify(sf));
}

function sortedKeysReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = obj[k];
        return acc;
      }, {});
  }
  return value;
}

// Stable JSON: sorts object keys so reordered-but-equivalent SaveFiles
// produce the same fingerprint.
export function fingerprint(sf: SaveFile): string {
  return JSON.stringify(sf, sortedKeysReplacer);
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
