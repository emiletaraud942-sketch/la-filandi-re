import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { rows } = await sql`
    SELECT id, name, category, site, qty, threshold, unit, unit_cost AS "unitCost", location
    FROM stock ORDER BY category, name
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO stock (name, category, site, qty, threshold, unit, unit_cost, location)
    VALUES (${b.name}, ${b.category}, ${b.site}, ${b.qty || 0}, ${b.threshold || 0}, ${b.unit || 'unité'}, ${b.unitCost || 0}, ${b.location || null})
    RETURNING id, name, category, site, qty, threshold, unit, unit_cost AS "unitCost", location
  `;
  const item = rows[0];
  if (item.qty > 0) {
    await sql`
      INSERT INTO stock_movements (stock_item_id, type, qty, date, note)
      VALUES (${item.id}, 'Entrée', ${item.qty}, CURRENT_DATE, 'Stock initial')
    `;
  }
  await logAction(session, 'stock.create', `stock:${item.id}`, `${item.name} (${item.qty} ${item.unit})`);
  return NextResponse.json(item, { status: 201 });
}
