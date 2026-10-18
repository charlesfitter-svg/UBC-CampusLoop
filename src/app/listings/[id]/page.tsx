import { notFound } from "next/navigation";
import { getListing } from "@/lib/data";
import { ListingDetail } from "@/components/listing-detail";
export const dynamic = "force-dynamic";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  return <ListingDetail listing={listing} />;
}
