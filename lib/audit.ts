import { sql } from './db';
import type { SessionPayload } from './session';

// Journal d'audit (Lot 08) : qui a fait quoi, quand, sur quelle fiche.
// Ne doit jamais faire échouer l'action auditée si l'écriture du journal
// échoue elle-même (mieux vaut une action sans trace qu'une action refusée).
export async function logAction(
  session: SessionPayload,
  action: string,
  target?: string | null,
  details?: string | null
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (actor_user_id, actor_name, action, target, details)
      VALUES (${session.uid}, ${session.username}, ${action}, ${target ?? null}, ${details ?? null})
    `;
  } catch {
    // volontairement silencieux
  }
}
