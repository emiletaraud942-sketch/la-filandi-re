import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

const STATUS_CYCLE: Record<string, string> = { 'À commander': 'Commandé', Commandé: 'Reçu', Reçu: 'À commander' };

export async function PATCH(req: NextRequest, { params }: { params: { matId: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const id = Number(params.matId);
  const { rows } = await sql<{ status: string }>`SELECT status FROM project_materials WHERE id = ${id}`;
  const current = rows[0]?.status;
  if (!current) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const updated = await sql`
    UPDATE project_materials SET status = ${STATUS_CYCLE[current]} WHERE id = ${id}
    RETURNING id, status
  `;
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { matId: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  await sql`DELETE FROM project_materials WHERE id = ${Number(params.matId)}`;
  return NextResponse.json({ ok: true });
}
