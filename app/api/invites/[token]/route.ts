import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Public — pas de session requise, c'est le point d'entrée d'un membre pas
// encore inscrit.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { rows } = await sql<{
    teamMemberId: number;
    teamMemberName: string;
    role: 'manager' | 'agent';
    expiresAt: string;
    usedAt: string | null;
  }>`
    SELECT i.team_member_id AS "teamMemberId", t.name AS "teamMemberName", i.role,
           i.expires_at AS "expiresAt", i.used_at AS "usedAt"
    FROM invites i JOIN team t ON t.id = i.team_member_id
    WHERE i.token = ${params.token}
  `;
  const invite = rows[0];
  if (!invite) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 410 });
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 });
  }
  return NextResponse.json({ teamMemberName: invite.teamMemberName, role: invite.role });
}
