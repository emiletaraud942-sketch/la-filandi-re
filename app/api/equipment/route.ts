import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { resolveProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const supplierId = await resolveProviderId(b.supplier);
  const { rows } = await sql`
    INSERT INTO equipment (name, category, site, location, brand, model, serial_number, purchase_date, warranty_end, supplier_id, notes)
    VALUES (${b.name}, ${b.category}, ${b.site}, ${b.location || null}, ${b.brand || null}, ${b.model || null},
            ${b.serialNumber || null}, ${b.purchaseDate || null}, ${b.warrantyEnd || null}, ${supplierId}, ${b.notes || null})
    RETURNING id, name, category, site, location, brand, model, serial_number AS "serialNumber",
              purchase_date AS "purchaseDate", warranty_end AS "warrantyEnd", notes
  `;
  return NextResponse.json({ ...rows[0], supplier: (b.supplier || '').trim() || null }, { status: 201 });
}
