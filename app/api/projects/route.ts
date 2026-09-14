import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { toPgTextArrayLiteral } from '@/lib/pgArray';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  if (!b.name || !b.startDate || !b.endDate) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }
  const teams: string[] = Array.isArray(b.teams) ? b.teams : [];
  const teamsLiteral = toPgTextArrayLiteral(teams);

  const { rows } = await sql`
    INSERT INTO projects (name, site, status, start_date, end_date, description, teams)
    VALUES (${b.name}, ${b.site}, ${b.status || 'À venir'}, ${b.startDate}, ${b.endDate}, ${b.description || null}, ${teamsLiteral}::text[])
    RETURNING id, name, site, status, start_date AS "startDate", end_date AS "endDate", description, teams
  `;
  return NextResponse.json({ ...rows[0], steps: [], materials: [] }, { status: 201 });
}
