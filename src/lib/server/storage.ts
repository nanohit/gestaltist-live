import { createClient } from '@libsql/client';
import { defaultContent, type SiteContent } from '$lib/content';
import { env } from '$env/dynamic/private';

const db = createClient({
  url: env.TURSO_DB_URL || 'file:local.db',
  authToken: env.TURSO_DB_AUTH_TOKEN,
});

let initialized = false;

async function init() {
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
  try {
    await init();
    const result = await db.execute(`SELECT data FROM content WHERE id = 'main'`);
    if (result.rows.length === 0) {
      await writeContent(defaultContent);
      return structuredClone(defaultContent);
    }
    const parsed = JSON.parse(result.rows[0].data as string);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      await writeContent(defaultContent);
      return structuredClone(defaultContent);
    }
    return parsed as SiteContent;
  } catch {
    return structuredClone(defaultContent);
  }
}

export async function writeContent(content: SiteContent): Promise<SiteContent> {
  await init();
  const json = JSON.stringify(content);
  await db.execute({
    sql: `INSERT OR REPLACE INTO content (id, data) VALUES ('main', ?)`,
    args: [json],
  });
  return content;
}
