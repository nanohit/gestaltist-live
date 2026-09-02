import { createClient, type Client } from '@libsql/client/web';
import type { SiteContent } from '$lib/content';
import snapshot from '$lib/content.snapshot.json';
import { env } from '$env/dynamic/private';

/**
 * Снапшот контента, вшитый в сборку. Используется как fallback,
 * если Turso недоступен, — сайт остаётся полностью рабочим.
 */
const fallbackContent = snapshot as unknown as SiteContent;

let client: Client | null = null;
let initialized = false;

function getClient(): Client | null {
  if (!env.TURSO_DB_URL) return null;
  if (!client) {
    client = createClient({
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_DB_AUTH_TOKEN,
    });
  }
  return client;
}

async function init(db: Client) {
  if (initialized) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data TEXT NOT NULL
    )
  `);
  initialized = true;
}

export async function readContent(): Promise<SiteContent> {
  const db = getClient();
  if (!db) return structuredClone(fallbackContent);
  try {
    await init(db);
    const result = await db.execute(`SELECT data FROM content WHERE id = 'main'`);
    if (result.rows.length === 0) {
      await writeContent(fallbackContent);
      return structuredClone(fallbackContent);
    }
    const parsed = JSON.parse(result.rows[0].data as string);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      return structuredClone(fallbackContent);
    }
    return parsed as SiteContent;
  } catch {
    return structuredClone(fallbackContent);
  }
}

export async function writeContent(content: SiteContent): Promise<SiteContent> {
  const db = getClient();
  if (!db) throw new Error('Хранилище не настроено: не задан TURSO_DB_URL');
  await init(db);
  await db.execute({
    sql: `INSERT OR REPLACE INTO content (id, data) VALUES ('main', ?)`,
    args: [JSON.stringify(content)],
  });
  return content;
}
