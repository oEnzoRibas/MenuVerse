import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const teamConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
export async function teamClient() {
  if (!teamConfigured) throw new Error("Configure o Supabase da equipe.");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            for (const { name, value, options } of values)
              jar.set(name, value, options);
          } catch {
            /* Server Components defer cookie updates to Route Handlers. */
          }
        },
      },
    },
  );
}
export async function getTeam() {
  const client = await teamClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const result = await client
    .from("restaurant_members")
    .select("restaurant_id,role,restaurants(name,slug)")
    .eq("user_id", data.claims.sub)
    .order("restaurant_id")
    .returns<Membership[]>();
  if (result.error) throw result.error;
  return { client, memberships: result.data };
}
type Membership = {
  restaurant_id: string;
  role: "admin" | "kitchen";
  restaurants: { name: string; slug: string };
};
