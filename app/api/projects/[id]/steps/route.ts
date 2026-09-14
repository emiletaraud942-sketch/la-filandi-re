import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const projectId = Number(params.id);
  const b = await req.json();
  if (!b.label || !b.date) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO project_steps (project_id, label, date, done) VALUES (${projectId}, ${b.label}, ${b.date}, false)
    RETURNING id, label, date, done
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
