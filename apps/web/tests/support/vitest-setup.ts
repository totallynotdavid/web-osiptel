import { inject } from "vitest";
import { types } from "pg";

process.env.DATABASE_URL = inject("DATABASE_URL");
types.setTypeParser(20, Number);
