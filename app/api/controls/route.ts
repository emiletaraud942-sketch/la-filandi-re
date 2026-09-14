import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  if (!b.name || !b.nextDue) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO controls (name, site, freq_months, last_done, next_due)
    VALUES (${b.name}, ${b.site}, ${b.freq || 12}, NULL, ${b.nextDue})
    RETURNING id, name, site, freq_months AS freq, last_done AS "lastDone", next_due AS "nextDue"
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
