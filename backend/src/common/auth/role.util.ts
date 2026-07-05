/**
 * Maps a stored center role (string or numeric) to the numeric tier used
 * across the app: 1=employee, 2=manager, 3=admin, 4=superadmin.
 */
export const ROLE_NAME_TO_ID: Record<string, number> = {
  superadmin: 4,
  super_admin: 4,
  admin: 3,
  administrateur: 3,
  administrator: 3,
  manager: 2,
  gerant: 2,
  responsable: 2,
  direction: 2,
  employee: 1,
  employe: 1,
  vendeur: 1,
  opticien: 1,
  assistant: 1,
  centre: 1,
  comptable: 1,
};

export function mapRoleToRoleId(role: unknown): number {
  if (role === null || role === undefined) return 1;
  if (typeof role === 'number') {
    return role >= 1 && role <= 4 ? role : 1;
  }
  const raw = String(role).trim();
  if (/^[1-4]$/.test(raw)) return Number(raw);
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return ROLE_NAME_TO_ID[normalized] ?? 1;
}
