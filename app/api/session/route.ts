import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  let member: { id: number; name: string; trade: string; site: string; phone: string | null } | null = null;
  if (session.teamMemberId) {
    const { rows } = await sql<{ id: number; name: string; trade: string; site: string; phone: string | null }>`
      SELECT id, name, trade, site, phone FROM team WHERE id = ${session.teamMemberId}
    `;
    member = rows[0] ?? null;
  }

  return NextResponse.json({
    authenticated: true,
    username: session.username,
    role: session.role,
    mustChangePassword: session.mustChangePassword,
    member,
  });
}
