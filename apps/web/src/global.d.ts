import type { Session } from "~/lib/auth/session";

declare namespace App {
  interface RequestEventLocals {
    nonce: string;
    session: Session | null;
  }
}
