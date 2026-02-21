import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ baseURL: window.location.origin });

export function useSession() {
  return authClient.useSession();
}
