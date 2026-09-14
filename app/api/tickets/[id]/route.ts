import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

const STATUS_CYCLE: Record<string, string> = { Nouveau: 'En cours', 'En cours': 'Terminé', Terminé: 'Nouveau' };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const id = Number(params.id);
  const b = await req.json();

  if (b.action === 'cycleStatus') {
    const { rows } = await sql<{ status: string }>`SELECT status FROM tickets WHERE id = ${id}`;
    const current = rows[0]?.status;
    if (!current) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    const next = STATUS_CYCLE[current];
    const completedAt = next === 'Terminé' ? new Date().toISOString().slice(0, 10) : null;
    const updated = await sql`
      UPDATE tickets SET status = ${next}, completed_at = ${completedAt} WHERE id = ${id}
      RETURNING id, status, completed_at AS "completedAt"
    `;
    return NextResponse.json(updated.rows[0]);
  }

  if (b.action === 'convert') {
    const projectId = Number(b.projectId);
    const updated = await sql`
      UPDATE tickets SET converted_project_id = ${projectId}, status = 'Terminé', completed_at = CURRENT_DATE
      WHERE id = ${id}
      RETURNING id, status, converted_project_id AS "convertedProjectId", completed_at AS "completedAt"
    `;
    return NextResponse.json(updated.rows[0]);
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  await sql`DELETE FROM tickets WHERE id = ${Number(params.id)}`;
  return NextResponse.json({ ok: true });
}
