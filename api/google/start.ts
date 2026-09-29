import { sameCode } from '../_lib/auth.js';
import { DRIVE_SCOPE } from '../_lib/drive.js';
import { env, escapeHtml, page } from '../_lib/env.js';

/**
 * One-time setup: GET /api/google/start?k=<FAMILY_CODE>
 * Sends you to Google to allow the app to save photos in your Drive.
 */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  if (!env.familyCode() || !sameCode(url.searchParams.get('k') || '', env.familyCode())) {
    return page('Connect Google Drive', '<p>Open this page as <code>/api/google/start?k=YOUR_FAMILY_CODE</code>. The family code is the <code>FAMILY_CODE</code> value in your Vercel settings.</p>', 401);
  }
  if (env.googleRefreshToken()) {
    return page('Google Drive is already connected', '<p>Photos are being saved to Drive. To connect a different account, remove <code>GOOGLE_REFRESH_TOKEN</code> and <code>GOOGLE_DRIVE_FOLDER_ID</code> in Vercel, redeploy, and open this page again.</p>');
  }
  if (!env.googleClientId() || !env.googleClientSecret()) {
    return page('Connect Google Drive', '<p>First add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Vercel and redeploy. The steps are in <code>docs/SETUP.md</code>.</p>', 501);
  }
  const redirectUri = `${url.origin}/api/google/callback`;
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.search = new URLSearchParams({
    client_id: env.googleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true'
  }).toString();
  return page('Connect Google Drive', `
<div class="card"><p>The app will only be able to see the photos it saves itself. It can't see anything else in your Drive.</p>
<p>Make sure this redirect address is added to your Google OAuth client:</p><p><code>${escapeHtml(redirectUri)}</code></p></div>
<p><a href="${escapeHtml(auth.toString())}" style="display:inline-block;background:#34505c;color:#fff;padding:.9rem 1.2rem;border-radius:12px;text-decoration:none;font-weight:700">Continue to Google</a></p>`);
}
