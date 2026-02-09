export const ROLES = ['admin', 'student', 'parent'] as const;
export type Role = (typeof ROLES)[number];
