import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const before = Number(searchParams.get('before') || 0);

  const { rows } = before
    ? await sql`
        SELECT id, actor_name AS "actorName", action, target, details, created_at AS "createdAt"
        FROM audit_log WHERE id < ${before} ORDER BY id DESC LIMIT 50
      `
    : await sql`
        SELECT id, actor_name AS "actorName", action, target, details, created_at AS "createdAt"
        FROM audit_log ORDER BY id DESC LIMIT 50
      `;

  return NextResponse.json({ entries: rows });
}
