const get = (k: string) => (process.env[k] || '').trim();

export const env = {
  familyCode: () => get('FAMILY_CODE'),
  supabaseUrl: () => get('SUPABASE_URL') || get('VITE_SUPABASE_URL'),
  supabaseServiceKey: () => get('SUPABASE_SERVICE_ROLE_KEY'),
  googleClientId: () => get('GOOGLE_CLIENT_ID'),
  googleClientSecret: () => get('GOOGLE_CLIENT_SECRET'),
  googleRefreshToken: () => get('GOOGLE_REFRESH_TOKEN'),
  googleFolderId: () => get('GOOGLE_DRIVE_FOLDER_ID')
};

export const driveReady = () => !!(env.googleClientId() && env.googleClientSecret() && env.googleRefreshToken() && env.googleFolderId());
export const storageReady = () => !!(env.supabaseUrl() && env.supabaseServiceKey());

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#f3f1ec;color:#2a2e33;max-width:40rem;margin:0 auto;padding:1.5rem;line-height:1.5}
code,textarea{font-family:ui-monospace,monospace;font-size:.9rem}textarea{width:100%;box-sizing:border-box;padding:.75rem;border:1.5px solid #9a968e;border-radius:12px;background:#fff}
h1{font-size:1.6rem}.card{background:#fff;border-radius:18px;padding:1rem 1.25rem;box-shadow:0 1px 2px rgba(42,46,51,.05),0 4px 12px rgba(42,46,51,.05);margin:1rem 0}</style></head>
<body><h1>${escapeHtml(title)}</h1>${body}</body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }
  );
