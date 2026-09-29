import { DEMO } from '../config';
import { nowIso, uid } from './format';
import { getFamilyCode } from './store/familyCode';
import type { FileRef } from './types';

/** Shrinks a phone photo before upload: long edge ≤ max px, JPEG. */
export async function compress(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', quality)
    );
  } catch {
    return file;
  }
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/**
 * Saves a photo and returns a reference to it.
 * Demo: a small thumbnail stays in this browser. Live: sent to /api/upload (Google Drive or Supabase Storage).
 */
export async function savePhoto(file: File, by: string, folder: 'receipts' | 'site'): Promise<FileRef> {
  const name = file.name || `${folder}-photo.jpg`;
  if (DEMO) {
    const small = await compress(file, 480, 0.6);
    return { id: uid(), name, by, at: nowIso(), provider: 'local', fileId: await blobToDataUrl(small) };
  }
  const body = await compress(file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'content-type': 'image/jpeg',
      'x-family-key': getFamilyCode(),
      'x-file-name': encodeURIComponent(name.replace(/\.[^.]+$/, '') + '.jpg'),
      'x-folder': folder
    },
    body
  });
  if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);
  const { provider, fileId } = (await res.json()) as { provider: 'drive' | 'supabase'; fileId: string };
  return { id: uid(), name, by, at: nowIso(), provider, fileId };
}

/** URL to show a saved photo, or null when there is no stored image (sample data). */
export function photoUrl(ref: { provider: string; fileId: string | null }): string | null {
  if (!ref.fileId) return null;
  if (ref.provider === 'local') return ref.fileId;
  const q = new URLSearchParams({ p: ref.provider, id: ref.fileId, k: getFamilyCode() });
  return `/api/photo?${q.toString()}`;
}
