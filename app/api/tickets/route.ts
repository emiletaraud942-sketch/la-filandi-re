import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO tickets (title, site, location, requester, priority, status, description, date_souhaitee)
    VALUES (${b.title}, ${b.site}, ${b.location || null}, ${b.requester || null},
            ${b.priority || 'normale'}, 'Nouveau', ${b.desc || null}, ${b.dateSouhaitee || null})
    RETURNING id, title, site, location, requester, priority, status, description AS desc,
              date_souhaitee AS "dateSouhaitee", created_at AS "createdAt",
              converted_project_id AS "convertedProjectId", completed_at AS "completedAt"
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
