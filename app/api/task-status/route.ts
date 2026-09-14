import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_STATUSES = new Set(['todo', 'doing', 'done']);

// L'id d'une tâche (générée par le planning ou ajoutée à la main) se
// termine toujours par "|<id du membre>" — voir db/schema.sql.
function memberIdFromTaskId(taskId: string): number | null {
  const seg = taskId.split('|').pop();
  const id = Number(seg);
  return Number.isInteger(id) ? id : null;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!taskId || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Champs invalides' }, { status: 400 });
  }

  if (session.role !== 'manager') {
    const owner = memberIdFromTaskId(taskId);
    if (owner === null || owner !== session.teamMemberId) {
      return NextResponse.json({ error: 'Vous ne pouvez modifier que vos propres tâches' }, { status: 403 });
    }
  }

  await sql`
    INSERT INTO task_status (task_id, status, updated_at)
    VALUES (${taskId}, ${status}, now())
    ON CONFLICT (task_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  `;
  return NextResponse.json({ ok: true });
}
