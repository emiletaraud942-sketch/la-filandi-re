import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';

const INVITE_TTL_DAYS = 7;

// Génère un lien d'invitation à usage unique plutôt qu'un mot de passe
// temporaire à transmettre à la main — le membre choisit lui-même son
// identifiant et son mot de passe en ouvrant le lien.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }

  const b = await req.json().catch(() => null);
  const teamMemberId = Number(b?.teamMemberId) || null;
  const role = b?.role === 'manager' ? 'manager' : 'agent';
  if (!teamMemberId) {
    return NextResponse.json({ error: 'Membre d\'équipe requis' }, { status: 400 });
  }

  const { rows: memberRows } = await sql`SELECT id, name FROM team WHERE id = ${teamMemberId}`;
  if (!memberRows[0]) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO invites (token, team_member_id, role, created_by, expires_at)
    VALUES (${token}, ${teamMemberId}, ${role}, ${session.uid}, ${expiresAt})
  `;
  await logAction(session, 'invite.create', `member:${teamMemberId}`, memberRows[0].name as string);

  const url = new URL('/invite.html', req.nextUrl.origin);
  url.searchParams.set('token', token);
  return NextResponse.json({ token, url: url.toString(), expiresAt }, { status: 201 });
}
