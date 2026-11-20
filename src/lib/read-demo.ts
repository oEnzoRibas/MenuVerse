import { redirect } from "next/navigation";
import { getDemoId, readDemo } from "./demo-store";

export async function requireDemo(section: "cardapio" | "painel" | "cozinha") {
  const id = await getDemoId();
  const snapshot = id ? await readDemo(id) : null;
  if (!snapshot) redirect("/demo?para=" + section);
  return snapshot.payload;
}
