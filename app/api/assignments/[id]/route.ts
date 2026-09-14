import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const id = Number(params.id);
  const b = await req.json();

  const { rows } = await sql<{
    member_id: number | null;
    external_member_name: string | null;
    team_label: string;
    task: string;
    date: string;
    linked_project_id: number | null;
    linked_ticket_id: number | null;
  }>`SELECT member_id, external_member_name, team_label, task, date, linked_project_id, linked_ticket_id
     FROM assignments WHERE id = ${id}`;
  const assignment = rows[0];
  if (!assignment) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const isOwner = session.role === 'agent' && assignment.member_id === session.teamMemberId;
  const isManager = session.role === 'manager';

  if (b.action === 'finish') {
    if (!isOwner && !isManager) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    let memberLabel = assignment.external_member_name ?? '';
    if (assignment.member_id) {
      const m = await sql<{ name: string }>`SELECT name FROM team WHERE id = ${assignment.member_id}`;
      memberLabel = m.rows[0]?.name ?? memberLabel;
    }

    await sql`
      INSERT INTO history (member_id, member_label, team_label, task, date, linked_project_id, linked_ticket_id, completed_at)
      VALUES (${assignment.member_id}, ${memberLabel}, ${assignment.team_label},
              ${assignment.task}, ${assignment.date}, ${assignment.linked_project_id}, ${assignment.linked_ticket_id}, CURRENT_DATE)
    `;
    const updated = await sql`UPDATE assignments SET status = 'Terminé' WHERE id = ${id} RETURNING id, status`;
    return NextResponse.json(updated.rows[0]);
  }

  if (b.action === 'reassign') {
    if (!isManager) return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
    if (!b.task) return NextResponse.json({ error: 'Tâche requise' }, { status: 400 });
    const updated = await sql`
      UPDATE assignments
      SET task = ${b.task}, status = 'À faire', linked_project_id = NULL, linked_ticket_id = NULL
      WHERE id = ${id}
      RETURNING id, task, status
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
  await sql`DELETE FROM assignments WHERE id = ${Number(params.id)}`;
  return NextResponse.json({ ok: true });
}
