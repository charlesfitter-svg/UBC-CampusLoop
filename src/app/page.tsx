import { getListings } from "@/lib/data";
import { Marketplace } from "@/components/marketplace";
export const dynamic = "force-dynamic";
export default async function Home() {
  const result = await getListings();
  return <Marketplace {...result} />;
}
