import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';

// Activer/désactiver un membre (lot 09). Un membre désactivé disparaît du
// planning (voir /api/bootstrap) sans perdre son historique — à la
// différence de la suppression définitive (DELETE, droit à l'effacement).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json().catch(() => null);
  if (typeof b?.active !== 'boolean') {
    return NextResponse.json({ error: 'Champ "active" (booléen) requis' }, { status: 400 });
  }
  await sql`UPDATE team SET active = ${b.active} WHERE id = ${Number(params.id)}`;
  await logAction(session, b.active ? 'team.activate' : 'team.deactivate', `member:${params.id}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  // Le compte de connexion éventuellement lié est détaché (team_member_id -> NULL)
  // par la contrainte ON DELETE SET NULL du schéma ; on supprime seulement la fiche équipe.
  await sql`DELETE FROM team WHERE id = ${Number(params.id)}`;
  await logAction(session, 'team.delete', `member:${params.id}`);
  return NextResponse.json({ ok: true });
}
