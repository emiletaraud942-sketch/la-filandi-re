import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_STATUSES = new Set(['ok', 'soon', 'urgent']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au chef d\'équipe' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  await sql`
    INSERT INTO zone_status (zone_id, status, updated_at)
    VALUES (${params.id}, ${status}, now())
    ON CONFLICT (zone_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  `;
  return NextResponse.json({ ok: true });
}
