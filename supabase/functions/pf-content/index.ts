// Edge function: lets the site owner edit content/*.md and upload images from anywhere.
// The browser never sees a GitHub token: it sends its Supabase (Discord) session, this function
// checks that the signed-in Discord account is the owner, then commits to the repo on their
// behalf. Pushing to main triggers the existing GitHub Pages deploy.
//
// Secrets (supabase secrets set ...):
//   GITHUB_TOKEN        fine-grained PAT, repo Yusi0/pf-archive, Contents: read & write
//   ALLOWED_DISCORD_ID  the owner's Discord user id
//   GITHUB_REPO         optional, default "Yusi0/pf-archive"
//   GITHUB_BRANCH       optional, default "main"
// Deploy with --no-verify-jwt: the token is verified below with auth.getUser().

import { createClient } from 'jsr:@supabase/supabase-js@2';

const REPO = Deno.env.get('GITHUB_REPO') ?? 'Yusi0/pf-archive';
const BRANCH = Deno.env.get('GITHUB_BRANCH') ?? 'main';
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') ?? '';
const ALLOWED_DISCORD_ID = Deno.env.get('ALLOWED_DISCORD_ID') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function requireOwner(req: Request) {
  if (!GITHUB_TOKEN || !ALLOWED_DISCORD_ID) throw new HttpError(500, '서버 설정(secrets)이 완료되지 않았습니다.');

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, '로그인이 필요합니다.');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, '로그인이 만료되었습니다. 다시 로그인하세요.');

  const discord = data.user.identities?.find((i) => i.provider === 'discord');
  const discordId = discord?.id ?? data.user.user_metadata?.provider_id;
  if (String(discordId) !== ALLOWED_DISCORD_ID) throw new HttpError(403, '편집 권한이 없는 계정입니다.');
}

async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pf-archive-editor',
      ...(init.headers ?? {}),
    },
  });
  return res;
}

function encodeUtf8Base64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function decodeUtf8Base64(b64: string) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** sha of an existing file, or null when it does not exist yet. */
async function currentSha(path: string): Promise<string | null> {
  const res = await gh(`/contents/${encodeURI(path)}?ref=${BRANCH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, `GitHub 조회 실패 (${res.status})`);
  return (await res.json()).sha as string;
}

async function putFile(path: string, contentBase64: string, message: string) {
  const sha = await currentSha(path);
  const res = await gh(`/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: contentBase64, branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new HttpError(502, `GitHub 저장 실패 (${res.status}): ${await res.text()}`);
}

const POST_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
const IMAGE_NAME = /^img_[A-Za-z0-9_]+\.(webp|png|jpe?g|gif)$/;

async function handle(req: Request) {
  await requireOwner(req);
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === 'list') {
    const res = await gh(`/contents/content?ref=${BRANCH}`);
    if (!res.ok) throw new HttpError(502, `GitHub 목록 조회 실패 (${res.status})`);
    const entries = (await res.json()) as { name: string; path: string; type: string }[];
    const files = await Promise.all(
      entries
        .filter((e) => e.type === 'file' && e.name.endsWith('.md'))
        .map(async (e) => {
          const r = await gh(`/contents/${encodeURI(e.path)}?ref=${BRANCH}`);
          if (!r.ok) throw new HttpError(502, `${e.name} 조회 실패 (${r.status})`);
          const f = await r.json();
          return { filename: e.name, rawText: decodeUtf8Base64(f.content), sha: f.sha };
        }),
    );
    return { files };
  }

  if (action === 'save') {
    const { filename, rawText } = body;
    if (!POST_NAME.test(filename ?? '') || typeof rawText !== 'string' || !rawText.trim()) {
      throw new HttpError(400, '파일 이름 또는 내용이 올바르지 않습니다.');
    }
    await putFile(`content/${filename}`, encodeUtf8Base64(rawText), `content: update ${filename}`);
    return { success: true, filename };
  }

  if (action === 'delete') {
    const { filename } = body;
    if (!POST_NAME.test(filename ?? '')) throw new HttpError(400, '파일 이름이 올바르지 않습니다.');
    const path = `content/${filename}`;
    const sha = await currentSha(path);
    if (!sha) throw new HttpError(404, '삭제할 파일이 없습니다.');
    const res = await gh(`/contents/${encodeURI(path)}`, {
      method: 'DELETE',
      body: JSON.stringify({ message: `content: delete ${filename}`, sha, branch: BRANCH }),
    });
    if (!res.ok) throw new HttpError(502, `GitHub 삭제 실패 (${res.status})`);
    return { success: true };
  }

  if (action === 'upload-image') {
    const { filename, base64 } = body;
    if (!IMAGE_NAME.test(filename ?? '') || typeof base64 !== 'string') {
      throw new HttpError(400, '이미지 이름 또는 데이터가 올바르지 않습니다.');
    }
    const data = base64.replace(/^data:image\/[\w+.-]+;base64,/, '');
    if (data.length > 7_000_000) throw new HttpError(413, '이미지가 너무 큽니다 (약 5MB 이하).');
    await putFile(`public/uploads/${filename}`, data, `uploads: add ${filename}`);
    return { url: `/uploads/${filename}`, filename };
  }

  throw new HttpError(400, '알 수 없는 요청입니다.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    return json(await handle(req));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: '서버 오류가 발생했습니다.' }, 500);
  }
});
