import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

const CHANNELS = new Set(['all', 'CLF', 'BMT']);

// Trois canaux : "all" (toute l'équipe), "CLF" et "BMT" (par site) — pour
// réduire le bruit sur une équipe de 15 personnes sur 2 sites. Un canal ne
// montre que ses propres messages (pas de fusion).
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channel = CHANNELS.has(searchParams.get('channel') || '') ? (searchParams.get('channel') as string) : 'all';
  const after = Number(searchParams.get('after') || 0);

  if (after > 0) {
    const { rows } = await sql`
      SELECT id, author_name AS "authorName", body, channel, created_at AS "createdAt"
      FROM messages WHERE channel = ${channel} AND id > ${after} ORDER BY id ASC LIMIT 200
    `;
    return NextResponse.json({ messages: rows });
  }

  const { rows } = await sql`
    SELECT id, author_name AS "authorName", body, channel, created_at AS "createdAt"
    FROM messages WHERE channel = ${channel} ORDER BY id DESC LIMIT 100
  `;
  return NextResponse.json({ messages: rows.slice().reverse() });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  const channel = CHANNELS.has(body?.channel) ? body.channel : 'all';
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: 'Message invalide (1 à 2000 caractères)' }, { status: 400 });
  }

  let authorName = session.username;
  if (session.teamMemberId) {
    const { rows } = await sql`SELECT name FROM team WHERE id = ${session.teamMemberId}`;
    if (rows[0]) authorName = rows[0].name as string;
  }

  const { rows } = await sql`
    INSERT INTO messages (author_user_id, author_name, body, channel)
    VALUES (${session.uid}, ${authorName}, ${text}, ${channel})
    RETURNING id, author_name AS "authorName", body, channel, created_at AS "createdAt"
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
