import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { resolveProviderId } from '@/lib/providers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const projectId = Number(params.id);
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const supplierId = await resolveProviderId(b.supplier);
  const { rows } = await sql`
    INSERT INTO project_materials (project_id, name, qty, unit, status, supplier_id, unit_cost)
    VALUES (${projectId}, ${b.name}, ${b.qty || 1}, ${b.unit || 'unité'}, 'À commander', ${supplierId}, ${b.unitCost || 0})
    RETURNING id, name, qty, unit, status, unit_cost AS "unitCost"
  `;
  return NextResponse.json({ ...rows[0], supplier: (b.supplier || '').trim() || null }, { status: 201 });
}
