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
    INSERT INTO providers (name, specialty, contact, phone, email, notes)
    VALUES (${b.name}, ${b.specialty || null}, ${b.contact || null}, ${b.phone || null}, ${b.email || null}, ${b.notes || null})
    RETURNING id, name, specialty, contact, phone, email, notes
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
