export type AuthRole = "participant" | "admin";

export interface AuthUser {
  sub: string;
  email: string;
  role: AuthRole;
  username?: string;
}
