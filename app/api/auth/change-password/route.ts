import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, hashPassword, verifyPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' }, { status: 400 });
  }

  const { rows } = await sql<{ password_hash: string }>`SELECT password_hash FROM users WHERE id = ${session.uid}`;
  const user = rows[0];
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newHash}, must_change_password = false WHERE id = ${session.uid}`;

  await logAction(session, 'auth.change-password');

  const token = await signSession({ ...session, mustChangePassword: false });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
