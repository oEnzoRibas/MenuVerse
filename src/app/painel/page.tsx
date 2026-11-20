import { DemoNav, Credit } from "@/components/ui";
import { Operations } from "@/components/operations";
import { requireDemo } from "@/lib/read-demo";
export const metadata = { title: "Painel administrativo" };
export default async function Page() {
  return (
    <>
      <DemoNav />
      <Operations initial={await requireDemo("painel")} mode="admin" />
      <footer className="site-footer">
        <div className="wrap">
          <Credit />
        </div>
      </footer>
    </>
  );
}
