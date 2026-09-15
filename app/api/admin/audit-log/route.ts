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
  const action = searchParams.get('action') || '';
  const actor = searchParams.get('actor') || '';
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 1000);

  if (searchParams.get('distinct') === 'actions') {
    const { rows } = await sql`SELECT DISTINCT action FROM audit_log ORDER BY action`;
    return NextResponse.json({ actions: rows.map((r: any) => r.action) });
  }
  if (searchParams.get('distinct') === 'actors') {
    const { rows } = await sql`SELECT DISTINCT actor_name AS name FROM audit_log ORDER BY actor_name`;
    return NextResponse.json({ actors: rows.map((r: any) => r.name) });
  }

  const { rows } = await sql`
    SELECT id, actor_name AS "actorName", action, target, details, created_at AS "createdAt"
    FROM audit_log
    WHERE (${before} = 0 OR id < ${before})
      AND (${action} = '' OR action = ${action})
      AND (${actor} = '' OR actor_name = ${actor})
    ORDER BY id DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ entries: rows });
}
