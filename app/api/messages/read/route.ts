import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const lastId = Number(body?.lastId) || 0;
  await sql`UPDATE users SET last_read_message_id = GREATEST(last_read_message_id, ${lastId}) WHERE id = ${session.uid}`;
  return NextResponse.json({ ok: true });
}
