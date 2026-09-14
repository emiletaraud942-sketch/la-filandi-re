import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  const memberId = Number(b.memberId);
  if (!memberId || !b.start || !b.end || b.end < b.start) {
    return NextResponse.json({ error: 'Champs invalides' }, { status: 400 });
  }

  const { rows } = await sql`
    INSERT INTO leaves (member_id, start_date, end_date, reason)
    VALUES (${memberId}, ${b.start}, ${b.end}, ${b.reason || null})
    RETURNING id, member_id AS "memberId", start_date AS start, end_date AS "end", reason
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
