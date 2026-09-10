import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { SiteContent } from '$lib/content';
import { CONTENT_BRANCH, CONTENT_FILE, GITHUB_OWNER, GITHUB_REPO } from '$lib/cdn';
import { readPublished, writePublished, type Published } from './storage';

/**
 * Публикация контента для jsDelivr: content.json коммитится в ветку content,
 * а хэш коммита сохраняется в базе и попадает в HTML-загрузчик. Так свежий
 * контент идёт посетителям с CDN, а не с Vercel.
 */

const API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_FILE}`;

/** С отступами — чтобы в истории ветки content были читаемые диффы. */
export function serializeContent(content: SiteContent): string {
  return JSON.stringify(content, null, 1) + '\n';
}

/** Тот же хэш, что считает git: по нему видно, что файл не изменился. */
function gitBlobSha(text: string): string {
  const bytes = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function githubHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'gestaltist-live',
  };
}

async function currentBlob(token: string): Promise<string | undefined> {
  const res = await fetch(`${API}?ref=${CONTENT_BRANCH}`, { headers: githubHeaders(token) });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return (await res.json()).sha;
}

function putFile(token: string, text: string, sha: string | undefined): Promise<Response> {
  return fetch(API, {
    method: 'PUT',
    headers: { ...githubHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'Контент: правка из админки',
      content: Buffer.from(text, 'utf8').toString('base64'),
      branch: CONTENT_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function publishContent(content: SiteContent): Promise<Published> {
  const token = env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new Error('не задан GITHUB_CONTENT_TOKEN');

  const text = serializeContent(content);
  const blob = gitBlobSha(text);
  const last = await readPublished();
  if (last?.blob === blob) return last;

  let res = await putFile(token, text, last?.blob);
  if (res.status === 409 || res.status === 422) {
    // Файл в ветке менялся в обход базы — берём его текущий хэш и повторяем.
    res = await putFile(token, text, await currentBlob(token));
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(`GitHub ${res.status}${detail?.message ? `: ${detail.message}` : ''}`);
  }
  const data = await res.json();
  const published: Published = { commit: data.commit.sha, blob: data.content.sha };
  await writePublished(published);
  return published;
}
