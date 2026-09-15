import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';

// Ajuster la quantité (prendre/ajouter du stock) est ouvert à tout compte
// authentifié — un agent qui utilise une pièce doit pouvoir la décompter
// lui-même. Créer/supprimer un article reste réservé au responsable.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const id = Number(params.id);
  const b = await req.json();

  if (b.action === 'adjust') {
    const delta = Number(b.delta); // +1 ou -1
    const { rows } = await sql<{ qty: number; name: string }>`SELECT qty, name FROM stock WHERE id = ${id}`;
    const current = rows[0];
    if (!current) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    if (current.qty + delta < 0) return NextResponse.json({ error: 'Quantité négative refusée' }, { status: 400 });

    const updated = await sql`UPDATE stock SET qty = qty + ${delta} WHERE id = ${id} RETURNING qty`;
    await sql`
      INSERT INTO stock_movements (stock_item_id, type, qty, date, note)
      VALUES (${id}, ${delta > 0 ? 'Entrée' : 'Sortie'}, ${Math.abs(delta)}, CURRENT_DATE, '')
    `;
    await logAction(session, 'stock.adjust', `stock:${id}`, `${current.name} : ${delta > 0 ? '+' : ''}${delta}`);
    return NextResponse.json({ id, qty: updated.rows[0].qty });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé au responsable technique' }, { status: 403 });
  }
  await sql`DELETE FROM stock WHERE id = ${Number(params.id)}`;
  await logAction(session, 'stock.delete', `stock:${params.id}`);
  return NextResponse.json({ ok: true });
}
