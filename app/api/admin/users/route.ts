import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

// Gestion minimale des comptes (Lot 01) : le responsable technique peut créer
// un accès pour un membre de l'équipe déjà enregistré, ou un second compte
// responsable. Le panneau d'administration complet (Lot 09) viendra plus tard.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const { rows } = await sql`
    SELECT u.id, u.username, u.role, u.must_change_password AS "mustChangePassword",
           u.created_at AS "createdAt", u.last_login_at AS "lastLoginAt",
           t.id AS "teamMemberId", t.name AS "teamMemberName"
    FROM users u LEFT JOIN team t ON t.id = u.team_member_id
    ORDER BY u.id
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  const username = String(b.username || '').trim().toLowerCase();
  const tempPassword = String(b.tempPassword || '');
  const role = b.role === 'manager' ? 'manager' : 'agent';
  const teamMemberId = role === 'agent' ? Number(b.teamMemberId) || null : null;

  if (!username || tempPassword.length < 8) {
    return NextResponse.json({ error: 'Identifiant et mot de passe (8 caractères min.) requis' }, { status: 400 });
  }
  if (role === 'agent' && !teamMemberId) {
    return NextResponse.json({ error: 'Un compte agent doit être lié à un membre de l\'équipe' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Cet identifiant existe déjà' }, { status: 409 });
  }

  const hash = await hashPassword(tempPassword);
  const { rows } = await sql`
    INSERT INTO users (username, password_hash, role, team_member_id, must_change_password)
    VALUES (${username}, ${hash}, ${role}, ${teamMemberId}, true)
    RETURNING id, username, role, team_member_id AS "teamMemberId"
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
