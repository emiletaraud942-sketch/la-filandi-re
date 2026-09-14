import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const id = Number(params.id);
  const b = await req.json();

  if (b.action === 'markDone') {
    const { rows } = await sql<{ freq_months: number }>`SELECT freq_months FROM controls WHERE id = ${id}`;
    const freq = rows[0]?.freq_months;
    if (!freq) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    const updated = await sql`
      UPDATE controls SET last_done = CURRENT_DATE, next_due = CURRENT_DATE + make_interval(months => ${freq})
      WHERE id = ${id}
      RETURNING id, last_done AS "lastDone", next_due AS "nextDue"
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
  await sql`DELETE FROM controls WHERE id = ${Number(params.id)}`;
  return NextResponse.json({ ok: true });
}
