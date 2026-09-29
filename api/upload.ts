import { requireFamily } from './_lib/auth.js';
import { uploadToDrive } from './_lib/drive.js';
import { driveReady, json, storageReady, text } from './_lib/env.js';
import { uploadToStorage } from './_lib/storage.js';

const MAX_BYTES = 4 * 1024 * 1024;

/** POST raw image bytes. Headers: x-family-key, x-file-name, x-folder (receipts | site). */
export async function POST(request: Request): Promise<Response> {
  const denied = requireFamily(request);
  if (denied) return denied;

  const folder = request.headers.get('x-folder') === 'site' ? 'site' : 'receipts';
  const contentType = request.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) return text('Only images can be uploaded.', 415);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return text('The photo was empty.', 400);
  if (bytes.length > MAX_BYTES) return text('The photo is too large (over 4 MB).', 413);

  const rawName = decodeURIComponent(request.headers.get('x-file-name') || 'photo.jpg').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'photo.jpg';
  const name = `${new Date().toISOString().slice(0, 10)} ${folder} ${rawName}`;

  try {
    if (driveReady()) return json({ provider: 'drive', fileId: await uploadToDrive(bytes, name, contentType) });
    if (storageReady()) return json({ provider: 'supabase', fileId: await uploadToStorage(bytes, folder, contentType) });
    return text('Photo storage is not set up yet. Add Google Drive or Supabase Storage keys (docs/SETUP.md).', 501);
  } catch (e) {
    console.error(e);
    return text('Could not save the photo. Please try again.', 502);
  }
}
