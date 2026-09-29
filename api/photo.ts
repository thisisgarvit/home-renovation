import { requireFamily } from './_lib/auth.js';
import { downloadFromDrive } from './_lib/drive.js';
import { driveReady, storageReady, text } from './_lib/env.js';
import { downloadFromStorage, SAFE_PATH } from './_lib/storage.js';

/** GET /api/photo?p=drive|supabase&id=…&k=familycode — streams a private photo to the app. */
export async function GET(request: Request): Promise<Response> {
  const denied = requireFamily(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const provider = url.searchParams.get('p');
  const id = url.searchParams.get('id') || '';

  let upstream: Response;
  try {
    if (provider === 'drive' && driveReady() && /^[\w-]{10,}$/.test(id)) upstream = await downloadFromDrive(id);
    else if (provider === 'supabase' && storageReady() && SAFE_PATH.test(id)) upstream = await downloadFromStorage(id);
    else return text('Photo not found.', 404);
  } catch (e) {
    console.error(e);
    return text('Could not load the photo.', 502);
  }
  if (!upstream.ok || !upstream.body) return text('Photo not found.', upstream.status === 404 ? 404 : 502);

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'image/jpeg',
      'cache-control': 'private, max-age=604800, immutable'
    }
  });
}
