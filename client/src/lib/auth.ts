import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ baseURL: "/api/auth" });

export function useSession() {
  return authClient.useSession();
}
