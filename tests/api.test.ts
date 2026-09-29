import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireFamily, sameCode } from '../api/_lib/auth';
import { multipartBody } from '../api/_lib/drive';
import { GET as photo } from '../api/photo';
import { POST as upload } from '../api/upload';

const ENV_KEYS = ['FAMILY_CODE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_DRIVE_FOLDER_ID'];
afterEach(() => {
  ENV_KEYS.forEach((k) => delete process.env[k]);
  vi.unstubAllGlobals();
});

describe('family code', () => {
  it('compares codes exactly', () => {
    expect(sameCode('abc', 'abc')).toBe(true);
    expect(sameCode('abd', 'abc')).toBe(false);
    expect(sameCode('', 'abc')).toBe(false);
    expect(sameCode('abcd', 'abc')).toBe(false);
  });

  it('rejects requests without the code and explains a missing server setting', async () => {
    expect(requireFamily(new Request('https://x/api/upload'))!.status).toBe(501);
    process.env.FAMILY_CODE = 'fam';
    expect(requireFamily(new Request('https://x/api/upload'))!.status).toBe(401);
    expect(requireFamily(new Request('https://x/api/upload', { headers: { 'x-family-key': 'fam' } }))).toBeNull();
    expect(requireFamily(new Request('https://x/api/photo?k=fam'))).toBeNull();
  });
});

describe('drive multipart body', () => {
  it('wraps metadata and bytes with the boundary', () => {
    const body = multipartBody({ name: 'a.jpg', parents: ['f'] }, new Uint8Array([1, 2, 3]), 'image/jpeg', 'B');
    const text = new TextDecoder().decode(body);
    expect(text.startsWith('--B\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"a.jpg","parents":["f"]}\r\n--B\r\nContent-Type: image/jpeg\r\n\r\n')).toBe(true);
    expect(text.endsWith('\r\n--B--')).toBe(true);
    expect(Array.from(body.slice(body.length - 10, body.length - 7))).toEqual([1, 2, 3]);
  });
});

describe('/api/upload', () => {
  const req = (body: BodyInit, headers: Record<string, string> = {}) =>
    new Request('https://x/api/upload', { method: 'POST', body, headers: { 'x-family-key': 'fam', 'content-type': 'image/jpeg', ...headers } });

  it('says clearly when no photo storage is set up', async () => {
    process.env.FAMILY_CODE = 'fam';
    const res = await upload(req(new Uint8Array([1])));
    expect(res.status).toBe(501);
  });

  it('refuses non-images', async () => {
    process.env.FAMILY_CODE = 'fam';
    expect((await upload(req('x', { 'content-type': 'text/plain' }))).status).toBe(415);
  });

  it('stores in Supabase Storage when Drive is not connected', async () => {
    Object.assign(process.env, { FAMILY_CODE: 'fam', SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'svc' });
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await upload(req(new Uint8Array([1, 2]), { 'x-folder': 'site' }));
    expect(res.status).toBe(200);
    const out = (await res.json()) as { provider: string; fileId: string };
    expect(out.provider).toBe('supabase');
    expect(out.fileId).toMatch(/^site\/\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://db.example/storage/v1/object/photos/${out.fileId}`);
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer svc');
  });

  it('prefers Google Drive once it is connected', async () => {
    Object.assign(process.env, {
      FAMILY_CODE: 'fam', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REFRESH_TOKEN: 'refresh', GOOGLE_DRIVE_FOLDER_ID: 'folder'
    });
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('oauth2')
        ? new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }))
        : new Response(JSON.stringify({ id: 'drive-file-123' }))
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await upload(req(new Uint8Array([9])));
    expect(await res.json()).toEqual({ provider: 'drive', fileId: 'drive-file-123' });
    const uploadCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('upload/drive')) as unknown as [string, RequestInit];
    expect((uploadCall[1].headers as Record<string, string>).authorization).toBe('Bearer tok');
  });
});

describe('/api/photo', () => {
  it('only serves safe storage paths', async () => {
    Object.assign(process.env, { FAMILY_CODE: 'fam', SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'svc' });
    const res = await photo(new Request('https://x/api/photo?k=fam&p=supabase&id=../../secret'));
    expect(res.status).toBe(404);
  });
});
