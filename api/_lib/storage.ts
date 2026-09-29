import { env } from './env.js';

const BUCKET = 'photos';

const headers = (extra: Record<string, string> = {}) => ({
  authorization: `Bearer ${env.supabaseServiceKey()}`,
  apikey: env.supabaseServiceKey(),
  ...extra
});

/** Only folder/yyyy-mm/uuid.jpg paths are accepted when reading back, so no other object can be fetched. */
export const SAFE_PATH = /^(receipts|site)\/\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/;

export async function uploadToStorage(bytes: Uint8Array, folder: string, contentType: string): Promise<string> {
  const month = new Date().toISOString().slice(0, 7);
  const path = `${folder}/${month}/${crypto.randomUUID()}.jpg`;
  const res = await fetch(`${env.supabaseUrl()}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: headers({ 'content-type': contentType, 'x-upsert': 'false' }),
    body: bytes as unknown as BodyInit
  });
  if (!res.ok) throw new Error(`Supabase Storage upload failed (${res.status}): ${await res.text()}`);
  return path;
}

export async function downloadFromStorage(path: string): Promise<Response> {
  return fetch(`${env.supabaseUrl()}/storage/v1/object/${BUCKET}/${path}`, { headers: headers() });
}
