import { notFound } from "next/navigation";
import { getListing } from "@/lib/data";
import { ListingEditor } from "@/components/listing-editor";
export default async function EditListing({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.is_demo) notFound();
  return <ListingEditor existing={listing} />;
}
