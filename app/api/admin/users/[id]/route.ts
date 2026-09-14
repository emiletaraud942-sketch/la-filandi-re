import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const id = Number(params.id);
  const b = await req.json();

  if (b.action === 'resetPassword') {
    const tempPassword = String(b.tempPassword || '');
    if (tempPassword.length < 8) {
      return NextResponse.json({ error: 'Mot de passe temporaire trop court (8 caractères min.)' }, { status: 400 });
    }
    const hash = await hashPassword(tempPassword);
    await sql`UPDATE users SET password_hash = ${hash}, must_change_password = true WHERE id = ${id}`;
    await logAction(session, 'user.reset-password', `user:${id}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const id = Number(params.id);
  if (id === session.uid) {
    return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 });
  }
  await sql`DELETE FROM users WHERE id = ${id}`;
  await logAction(session, 'user.delete', `user:${id}`);
  return NextResponse.json({ ok: true });
}
