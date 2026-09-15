import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Public — le membre choisit son propre identifiant/mot de passe (pas de
// changement forcé au premier login, puisqu'il vient de le choisir lui-même).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { rows } = await sql<{
    id: number;
    teamMemberId: number;
    role: 'manager' | 'agent';
    expiresAt: string;
    usedAt: string | null;
  }>`
    SELECT id, team_member_id AS "teamMemberId", role, expires_at AS "expiresAt", used_at AS "usedAt"
    FROM invites WHERE token = ${params.token}
  `;
  const invite = rows[0];
  if (!invite) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 410 });
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!username || password.length < 8) {
    return NextResponse.json({ error: 'Identifiant et mot de passe (8 caractères min.) requis' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Cet identifiant existe déjà' }, { status: 409 });
  }

  const hash = await hashPassword(password);
  await sql`
    INSERT INTO users (username, password_hash, role, team_member_id, must_change_password)
    VALUES (${username}, ${hash}, ${invite.role}, ${invite.teamMemberId}, false)
  `;
  await sql`UPDATE invites SET used_at = now() WHERE id = ${invite.id}`;

  return NextResponse.json({ ok: true });
}
