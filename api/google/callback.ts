import { createFolder, exchangeCode } from '../_lib/drive.js';
import { env, escapeHtml, page } from '../_lib/env.js';

/** Google sends you back here after "Allow". Shows the two values to paste into Vercel. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (env.googleRefreshToken()) {
    return page('Google Drive is already connected', '<p>Nothing to do here.</p>');
  }
  const error = url.searchParams.get('error');
  if (error) return page('Google Drive was not connected', `<p>Google said: <code>${escapeHtml(error)}</code>. You can close this page and try again.</p>`, 400);
  const code = url.searchParams.get('code');
  if (!code) return page('Google Drive was not connected', '<p>No sign-in code came back from Google. Start again from <code>/api/google/start</code>.</p>', 400);

  try {
    const tokens = await exchangeCode(code, `${url.origin}/api/google/callback`);
    if (!tokens.refresh_token) {
      return page('One more step', `<p>Google didn't send a long-lasting key, which happens if the app was allowed before.
Open <a href="https://myaccount.google.com/permissions">your Google account permissions</a>, remove this app, then start again.</p>`, 400);
    }
    const folderId = await createFolder(tokens.access_token, 'Home renovation photos');
    return page('Google Drive is connected', `
<p>A folder called <b>Home renovation photos</b> was created in your Drive. Paste these two values into Vercel → Settings → Environment Variables, then redeploy.</p>
<div class="card"><p><b>GOOGLE_REFRESH_TOKEN</b></p><textarea rows="3" readonly onclick="this.select()">${escapeHtml(tokens.refresh_token)}</textarea>
<p><b>GOOGLE_DRIVE_FOLDER_ID</b></p><textarea rows="1" readonly onclick="this.select()">${escapeHtml(folderId)}</textarea></div>
<p>Keep the refresh token private: it lets the app save photos to your Drive. Close this page when you're done.</p>`);
  } catch (e) {
    console.error(e);
    return page('Google Drive was not connected', `<p>${escapeHtml(e instanceof Error ? e.message : 'Something went wrong.')}</p>`, 502);
  }
}
