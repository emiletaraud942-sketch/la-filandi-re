import { sql } from './db';

// Les formulaires du front-end ne saisissent qu'un nom de fournisseur en
// texte libre (pas un identifiant) — on le résout ici vers providers.id
// pour conserver une vraie clé étrangère en base.
export async function resolveProviderId(name: string | null | undefined): Promise<number | null> {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const { rows } = await sql<{ id: number }>`SELECT id FROM providers WHERE name = ${trimmed} LIMIT 1`;
  return rows[0]?.id ?? null;
}
