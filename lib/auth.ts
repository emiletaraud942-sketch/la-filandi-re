// Barrel de commodité pour les routes API (runtime Node). Ne jamais importer
// ce fichier depuis middleware.ts — utiliser lib/session.ts directement pour
// rester compatible avec l'Edge Runtime (pas de bcrypt).
export * from './session';
export * from './password';
