export type UserRole = 'admin' | 'student' | 'parent';

export interface UserProfile {
  id: string;
  role: UserRole;
}
