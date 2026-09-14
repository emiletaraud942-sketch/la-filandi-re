import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  if (!b.date || !b.member || !b.task) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const memberName = String(b.member).trim();
  const matched = await sql<{ id: number }>`SELECT id FROM team WHERE lower(name) = lower(${memberName}) LIMIT 1`;
  const memberId = matched.rows[0]?.id ?? null;

  const { rows } = await sql`
    INSERT INTO assignments (date, member_id, external_member_name, team_label, site, horaire_start, horaire_end, phone, task, linked_project_id, linked_ticket_id, status)
    VALUES (${b.date}, ${memberId}, ${memberId ? null : memberName}, ${b.team}, ${b.site},
            ${b.horaireStart}, ${b.horaireEnd}, ${b.phone || null}, ${b.task},
            ${b.linkedProjectId || null}, ${b.linkedTicketId || null}, 'À faire')
    RETURNING id, date, team_label AS team, site, horaire_start AS "horaireStart", horaire_end AS "horaireEnd",
              phone, task, linked_project_id AS "linkedProjectId", linked_ticket_id AS "linkedTicketId", status
  `;
  return NextResponse.json({ ...rows[0], member: memberName }, { status: 201 });
}
