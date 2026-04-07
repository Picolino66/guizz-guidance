import { AuthUser } from "./auth-user.type";

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user: AuthUser;
}
