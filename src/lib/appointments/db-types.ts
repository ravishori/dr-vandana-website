import type { IdentityDb } from "@/lib/identity/db";

/**
 * Query surface shared by IdentityDb and Drizzle transaction clients.
 */
export type AppointmentQueryDb = Pick<IdentityDb, "select" | "insert" | "update" | "execute">;
