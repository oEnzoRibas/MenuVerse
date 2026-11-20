"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { teamClient, teamConfigured } from "@/lib/team";
export async function signIn(form: FormData) {
  if (!teamConfigured) redirect("/equipe");
  const input = z
    .object({ email: z.email(), password: z.string().min(1).max(256) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!input.success) redirect("/equipe?erro=1");
  const client = await teamClient();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error) redirect("/equipe?erro=1");
  redirect("/equipe");
}
export async function signOut() {
  const client = await teamClient();
  await client.auth.signOut({ scope: "local" });
  redirect("/equipe");
}
