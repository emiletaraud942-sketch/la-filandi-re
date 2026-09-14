import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword, signSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { isLockedOut, recordLoginAttempt } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Identifiant et mot de passe requis' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  if (await isLockedOut(username)) {
    return NextResponse.json(
      { error: 'Trop de tentatives échouées. Réessayez dans quelques minutes.' },
      { status: 429 }
    );
  }

  const { rows } = await sql<{
    id: number;
    username: string;
    password_hash: string;
    role: 'manager' | 'agent';
    team_member_id: number | null;
    must_change_password: boolean;
  }>`SELECT id, username, password_hash, role, team_member_id, must_change_password
     FROM users WHERE username = ${username}`;

  const user = rows[0];
  const valid = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !valid) {
    await recordLoginAttempt(username, ip, false);
    return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect' }, { status: 401 });
  }

  await recordLoginAttempt(username, ip, true);
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;

  const token = await signSession({
    uid: user.id,
    username: user.username,
    role: user.role,
    teamMemberId: user.team_member_id,
    mustChangePassword: user.must_change_password,
  });

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    mustChangePassword: user.must_change_password,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
