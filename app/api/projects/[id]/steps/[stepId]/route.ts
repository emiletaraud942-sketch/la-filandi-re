import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Le toggle est ouvert à tout utilisateur connecté (agent ou responsable) :
// un agent doit pouvoir cocher les étapes du chantier sur lequel il travaille.
export async function PATCH(req: NextRequest, { params }: { params: { stepId: string } }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { rows } = await sql`
    UPDATE project_steps SET done = NOT done WHERE id = ${Number(params.stepId)}
    RETURNING id, label, date, done
  `;
  if (!rows[0]) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { stepId: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  await sql`DELETE FROM project_steps WHERE id = ${Number(params.stepId)}`;
  return NextResponse.json({ ok: true });
}
