import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Renvoie toutes les données sous la forme exacte attendue par le front-end
// existant (public/app.html) — mêmes noms de champs que l'ancien objet
// `data` en mémoire, pour ne rien changer au code de rendu.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const [
    team,
    leaves,
    providers,
    tickets,
    controls,
    projects,
    steps,
    materials,
    stock,
    stockMovements,
    equipment,
    assignments,
    history,
  ] = await Promise.all([
    sql`SELECT id, name, trade, site, phone, active FROM team ORDER BY id`,
    sql`SELECT id, member_id AS "memberId", start_date AS start, end_date AS "end", reason FROM leaves ORDER BY id`,
    sql`SELECT id, name, specialty, contact, phone, email, notes FROM providers ORDER BY id`,
    sql`SELECT id, title, site, location, requester, priority, status, description AS desc,
               date_souhaitee AS "dateSouhaitee", created_at AS "createdAt",
               converted_project_id AS "convertedProjectId", completed_at AS "completedAt"
        FROM tickets ORDER BY id`,
    sql`SELECT id, name, site, freq_months AS freq, last_done AS "lastDone", next_due AS "nextDue"
        FROM controls ORDER BY id`,
    sql`SELECT id, name, site, status, start_date AS "startDate", end_date AS "endDate", description, teams
        FROM projects ORDER BY id`,
    sql`SELECT id, project_id AS "projectId", label, date, done FROM project_steps ORDER BY project_id, date`,
    sql`SELECT m.id, m.project_id AS "projectId", m.name, m.qty, m.unit, m.status,
               p.name AS supplier, m.unit_cost AS "unitCost"
        FROM project_materials m LEFT JOIN providers p ON p.id = m.supplier_id
        ORDER BY m.project_id, m.id`,
    sql`SELECT id, name, category, site, qty, threshold, unit, unit_cost AS "unitCost", location
        FROM stock ORDER BY id`,
    sql`SELECT id, stock_item_id AS "stockItemId", type, qty, date, note FROM stock_movements ORDER BY date DESC, id DESC`,
    sql`SELECT e.id, e.name, e.category, e.site, e.location, e.brand, e.model,
               e.serial_number AS "serialNumber", e.purchase_date AS "purchaseDate",
               e.warranty_end AS "warrantyEnd", p.name AS supplier, e.notes
        FROM equipment e LEFT JOIN providers p ON p.id = e.supplier_id
        ORDER BY e.id`,
    sql`SELECT a.id, a.date, COALESCE(t.name, a.external_member_name) AS member,
               a.team_label AS team, a.site, a.horaire_start AS "horaireStart",
               a.horaire_end AS "horaireEnd", a.phone, a.task,
               a.linked_project_id AS "linkedProjectId", a.linked_ticket_id AS "linkedTicketId", a.status
        FROM assignments a LEFT JOIN team t ON t.id = a.member_id
        ORDER BY a.date, a.horaire_start`,
    sql`SELECT id, date, member_label AS member, team_label AS team, task,
               linked_project_id AS "linkedProjectId", linked_ticket_id AS "linkedTicketId", completed_at AS "completedAt"
        FROM history ORDER BY completed_at DESC, id DESC`,
  ]);

  const stepsByProject = new Map<number, unknown[]>();
  for (const s of steps.rows as any[]) {
    const { projectId, ...rest } = s;
    if (!stepsByProject.has(projectId)) stepsByProject.set(projectId, []);
    stepsByProject.get(projectId)!.push(rest);
  }
  const materialsByProject = new Map<number, unknown[]>();
  for (const m of materials.rows as any[]) {
    const { projectId, ...rest } = m;
    if (!materialsByProject.has(projectId)) materialsByProject.set(projectId, []);
    materialsByProject.get(projectId)!.push(rest);
  }

  const projectsOut = (projects.rows as any[]).map((p) => ({
    ...p,
    steps: stepsByProject.get(p.id) ?? [],
    materials: materialsByProject.get(p.id) ?? [],
  }));

  return NextResponse.json({
    team: team.rows,
    leaves: leaves.rows,
    providers: providers.rows,
    tickets: tickets.rows,
    controls: controls.rows,
    projects: projectsOut,
    stock: stock.rows,
    stockMovements: stockMovements.rows,
    equipment: equipment.rows,
    assignments: assignments.rows,
    history: history.rows,
  });
}
