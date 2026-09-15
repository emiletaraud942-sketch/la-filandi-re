import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Renvoie les données nécessaires à l'écran "Planning Service Technique"
// (public/app.html) : équipe, congés, statuts de tâches enregistrés,
// tâches ajoutées à la main, et état de propreté des zones.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const [team, leaves, taskStatus, extraTasks, zones, stock] = await Promise.all([
    sql`SELECT id, name, trade, site, phone, active FROM team WHERE active ORDER BY id`,
    sql`SELECT id, member_id AS "memberId", start_date AS start, end_date AS "end", reason FROM leaves ORDER BY id`,
    sql`SELECT task_id AS "taskId", status FROM task_status`,
    sql`SELECT id, day, title, urgent, member_id AS "memberId", site FROM extra_tasks ORDER BY day, id`,
    sql`SELECT z.id, z.site, z.name, z.base_status AS base, COALESCE(zs.status, z.base_status) AS status
        FROM zones z LEFT JOIN zone_status zs ON zs.zone_id = z.id
        ORDER BY z.id`,
    sql`SELECT id, name, category, site, qty, threshold, unit, unit_cost AS "unitCost", location
        FROM stock ORDER BY category, name`,
  ]);

  return NextResponse.json({
    team: team.rows,
    leaves: leaves.rows,
    taskStatus: taskStatus.rows,
    extraTasks: extraTasks.rows,
    zones: zones.rows,
    stock: stock.rows,
    session: {
      username: session.username,
      role: session.role,
      teamMemberId: session.teamMemberId,
    },
  });
}
