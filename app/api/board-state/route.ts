import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Interrogé toutes les ~20s par l'écran (lot 03, "mise à jour en direct")
// pour refléter les changements de statut faits par d'autres utilisateurs
// sans recharger la page. Volontairement léger : pas de websocket, un
// simple polling suffit à ce volume d'utilisateurs.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const [taskStatus, zones] = await Promise.all([
    sql`SELECT task_id AS "taskId", status FROM task_status`,
    sql`SELECT z.id, COALESCE(zs.status, z.base_status) AS status
        FROM zones z LEFT JOIN zone_status zs ON zs.zone_id = z.id`,
  ]);

  return NextResponse.json({ taskStatus: taskStatus.rows, zones: zones.rows });
}
