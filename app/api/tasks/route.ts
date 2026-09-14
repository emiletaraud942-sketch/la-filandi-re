import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Ajout d'une tâche à la main sur le planning du jour — réservé au
// responsable/chef d'équipe (seul rôle pour qui l'écran propose ce bouton).
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au chef d\'équipe' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const day = typeof body?.day === 'string' ? body.day : '';
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const urgent = Boolean(body?.urgent);
  const memberId = Number(body?.memberId);
  const site = typeof body?.site === 'string' ? body.site : '';

  if (!day || !title || !memberId || !site) {
    return NextResponse.json({ error: 'Champs invalides' }, { status: 400 });
  }

  const { rows } = await sql`
    INSERT INTO extra_tasks (day, title, urgent, member_id, site)
    VALUES (${day}, ${title}, ${urgent}, ${memberId}, ${site})
    RETURNING id, day, title, urgent, member_id AS "memberId", site
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
