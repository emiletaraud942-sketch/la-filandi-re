import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { rows } = await sql<{ lastRead: number; count: number }>`
    SELECT u.last_read_message_id AS "lastRead",
           (SELECT COUNT(*)::int FROM messages WHERE id > u.last_read_message_id) AS count
    FROM users u WHERE u.id = ${session.uid}
  `;
  return NextResponse.json(rows[0] || { lastRead: 0, count: 0 });
}
