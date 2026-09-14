import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO team (name, trade, site, phone, active)
    VALUES (${b.name}, ${b.trade}, ${b.site}, ${b.phone || null}, true)
    RETURNING id, name, trade, site, phone, active
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
