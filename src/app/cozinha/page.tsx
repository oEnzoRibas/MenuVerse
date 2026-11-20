import { DemoNav } from "@/components/ui";
import { Operations } from "@/components/operations";
import { requireDemo } from "@/lib/read-demo";
export const metadata = { title: "Cozinha" };
export default async function Page() {
  return (
    <>
      <DemoNav />
      <Operations initial={await requireDemo("cozinha")} mode="kitchen" />
    </>
  );
}
