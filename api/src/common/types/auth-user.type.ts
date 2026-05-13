export type AuthRole = "participant" | "ADMIN" | "USER";

export interface AuthUser {
  sub: string;
  email: string;
  role: AuthRole;
  username?: string;
}
