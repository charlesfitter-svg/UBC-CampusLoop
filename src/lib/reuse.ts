import type { Listing } from "./marketplace";

export const reuseResources = [
  {
    id: "free-store",
    name: "UBC Free Store",
    href: "https://sustain.ubc.ca/ubc-free-store",
    description:
      "General student item reuse and suitable donations. Check which items can be accepted before bringing anything bulky or electrical.",
    location: "AMS Nest, Room 0021",
    destination: "AMS Student Nest, 6133 University Blvd, Vancouver, BC",
  },
  {
    id: "get-thrifty",
    name: "Get Thrifty UBC",
    href: "https://getthrifty.ca/pages/how-to-donate",
    description:
      "Gently used clothing and eligible accessories only, subject to their acceptance policy. Not a furniture or electronics drop-off.",
    location: "UBC Life Building, Room 0014",
    destination: "Get Thrifty UBC, 6138 Student Union Blvd, Vancouver, BC",
  },
  {
    id: "food-bank",
    name: "AMS Food Bank",
    href: "https://www.ams.ubc.ca/support-services/student-services/food-bank/",
    description:
      "Eligible non-perishable food donations. Arrange other donations with the Food Bank first. Do not assume prepared meals, opened products or expired food are accepted.",
    location: "UBC Life Building, Room 0023",
    destination: "UBC Life Building, 6138 Student Union Blvd, Vancouver, BC",
  },
  {
    id: "sprouts",
    name: "UBC Sprouts Community Fridge",
    href: "https://ubc-sprouts.squarespace.com/community-fridge",
    description:
      "Food redistribution subject to current food-safety and acceptance guidance. Confirm current operation and guidelines with Sprouts before visiting; never bring unsafe or expired food.",
    location: "Outside Sprouts Cafe, UBC Life Building basement",
    destination: "UBC Life Building, 6138 Student Union Blvd, Vancouver, BC",
  },
  {
    id: "zero-waste",
    name: "UBC Zero Waste Market",
    href: "https://zero-waste-market.ubc.ca/donations/",
    description:
      "Institutional furniture and equipment reuse information for eligible UBC departments and affiliated campus organizations. Not an ordinary personal student drop-off; contact the program about eligibility and arrangements.",
    location: null,
    destination: null,
  },
  {
    id: "recyclepedia",
    name: "UBC Recyclepedia",
    href: "https://sustain.ubc.ca/resources/campus-guides/sort-it-out/z-recyclepedia-search",
    description:
      "Find appropriate disposal information when reuse or donation is not possible.",
    location: null,
    destination: null,
  },
] as const;

export function recommendedReuseIds(
  listing: Pick<Listing, "category" | "subcategory">,
) {
  if (listing.category === "food")
    return ["food-bank", "sprouts", "recyclepedia"];
  if (listing.subcategory === "Furniture")
    return ["zero-waste", "recyclepedia"];
  // The current taxonomy has no Clothing category. Other may include clothing;
  // this suggestion remains explicitly conditional on each resource's guidelines.
  if (listing.subcategory === "Other")
    return ["free-store", "get-thrifty", "recyclepedia"];
  return ["free-store", "recyclepedia"];
}

export function reuseDirections(destination: string) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  url.searchParams.set("travelmode", "walking");
  return url.toString();
}

export function reuseLink(listing: Pick<Listing, "category" | "subcategory">) {
  return `/reuse?${new URLSearchParams({ category: listing.category, subcategory: listing.subcategory })}`;
}
