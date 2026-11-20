import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { seedDemo } from "./demo-data";
import type { Demo } from "./domain";

export const demoCookie = "menuverse_demo";
export const lifetime = 86400 * 7;
const demoKey = process.env.SUPABASE_DEMO_SECRET_KEY;
const demoUrl = process.env.SUPABASE_DEMO_URL;
const remote =
  demoKey && demoUrl
    ? createClient(demoUrl, demoKey, { auth: { persistSession: false } })
    : null;
if (Boolean(demoKey) !== Boolean(demoUrl))
  throw new Error("Configure as duas variáveis de Supabase da demonstração.");
if (
  demoUrl &&
  demoUrl.replace(/\/$/, "") ===
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
) {
  throw new Error(
    "Use projetos Supabase distintos para a operação e a demonstração.",
  );
}

let local: DatabaseSync | undefined;
function database() {
  if (local) return local;
  if (process.env.VERCEL)
    throw new Error("A demonstração na Vercel exige armazenamento Supabase.");
  const file = resolve(process.env.MENUVERSE_DEMO_DB ?? ".data/demo.sqlite");
  mkdirSync(dirname(file), { recursive: true });
  local = new DatabaseSync(file);
  local.exec(
    "PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS demo_sessions (id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL, expires_at TEXT NOT NULL)",
  );
  return local;
}
type Snapshot = { version: number; payload: Demo };
export async function readDemo(id: string): Promise<Snapshot | null> {
  const now = new Date().toISOString();
  if (remote) {
    const { data, error } = await remote
      .from("demo_sessions")
      .select("version,payload")
      .eq("id", id)
      .gt("expires_at", now)
      .maybeSingle<Snapshot>();
    if (error) throw error;
    return data;
  }
  const row = database()
    .prepare(
      "SELECT version,payload FROM demo_sessions WHERE id = ? AND expires_at > ?",
    )
    .get(id, now);
  return row
    ? { version: Number(row.version), payload: JSON.parse(String(row.payload)) }
    : null;
}
export async function newDemo() {
  const id = randomBytes(32).toString("hex");
  const payload = seedDemo();
  const expires_at = new Date(Date.now() + lifetime * 1000).toISOString();
  const now = new Date().toISOString();
  if (remote) {
    const { error } = await remote
      .from("demo_sessions")
      .insert({ id, payload, expires_at });
    if (error) throw error;
  } else {
    const db = database();
    db.prepare("DELETE FROM demo_sessions WHERE expires_at <= ?").run(now);
    db.prepare(
      "INSERT INTO demo_sessions (id, payload, expires_at) VALUES (?, ?, ?)",
    ).run(id, JSON.stringify(payload), expires_at);
  }
  return id;
}
export async function getDemoId() {
  const id = (await cookies()).get(demoCookie)?.value;
  return id && /^[0-9a-f]{64}$/.test(id) ? id : null;
}
export async function updateDemo<T>(id: string, edit: (state: Demo) => T) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const snapshot = await readDemo(id);
    if (!snapshot)
      throw new Error("Sua sessão expirou. Reabra a demonstração.");
    const { payload, version } = snapshot;
    const result = edit(payload);
    const now = new Date().toISOString();
    if (remote) {
      const { data, error } = await remote
        .from("demo_sessions")
        .update({ version: version + 1, payload })
        .eq("id", id)
        .eq("version", version)
        .gt("expires_at", now)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data) return result;
    } else {
      const write = database()
        .prepare(
          "UPDATE demo_sessions SET version = version + 1, payload = ? WHERE id = ? AND version = ? AND expires_at > ?",
        )
        .run(JSON.stringify(payload), id, version, now);
      if (write.changes) return result;
    }
  }
  throw new Error("Ocorreram alterações simultâneas. Tente novamente.");
}
