import { env } from './env.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let cached: { token: string; expires: number } | null = null;

/** Exchanges the stored refresh token for a short-lived access token (cached while the function stays warm). */
export async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      refresh_token: env.googleRefreshToken(),
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/** Builds a multipart/related body: JSON metadata followed by the file bytes. */
export function multipartBody(metadata: object, bytes: Uint8Array, contentType: string, boundary: string): Uint8Array {
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const out = new Uint8Array(head.length + bytes.length + tail.length);
  out.set(head, 0);
  out.set(bytes, head.length);
  out.set(tail, head.length + bytes.length);
  return out;
}

export async function uploadToDrive(bytes: Uint8Array, name: string, contentType: string): Promise<string> {
  const token = await accessToken();
  const boundary = `renovation-${crypto.randomUUID()}`;
  const body = multipartBody({ name, parents: [env.googleFolderId()] }, bytes, contentType, boundary);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${boundary}` },
    body: body as unknown as BodyInit
  });
  if (!res.ok) throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

export async function downloadFromDrive(id: string): Promise<Response> {
  const token = await accessToken();
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
    headers: { authorization: `Bearer ${token}` }
  });
}

export async function createFolder(token: string, name: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' })
  });
  if (!res.ok) throw new Error(`Could not create the Drive folder (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string };
}
