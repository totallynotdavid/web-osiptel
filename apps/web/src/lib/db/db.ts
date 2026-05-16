import { env } from "~/lib/env";
import { createDb } from "./client";

export const db = createDb(env.database.url);
