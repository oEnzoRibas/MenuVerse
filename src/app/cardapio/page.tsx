import { createHash } from "node:crypto";
import { Credit, DemoNav } from "@/components/ui";
import { getDemoId } from "@/lib/demo-store";
import { requireDemo } from "@/lib/read-demo";
import { Menu } from "@/components/menu";
export const metadata = { title: "Cardápio do Brasa & Co." };
export default async function Page() {
  const { categories, products, settings } = await requireDemo("cardapio");
  const namespace = createHash("sha256")
    .update((await getDemoId()) ?? "")
    .digest("hex")
    .slice(0, 20);
  return (
    <>
      <DemoNav />
      <Menu
        namespace={"demo-" + namespace}
        catalog={{ categories, products, settings }}
      />
      <footer className="site-footer">
        <div className="wrap">
          <strong>{settings.name}</strong>
          <Credit />
        </div>
      </footer>
    </>
  );
}
