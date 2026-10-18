import Link from "next/link";
import {
  recommendedReuseIds,
  reuseDirections,
  reuseResources,
} from "@/lib/reuse";
import { subcategories } from "@/lib/marketplace";

export default async function ReusePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category =
    params.category === "food"
      ? "food"
      : params.category === "items"
        ? "items"
        : null;
  const subcategory =
    subcategories.find((value) => value === params.subcategory) ?? "Other";
  const recommendations = category
    ? recommendedReuseIds({ category, subcategory })
    : [];
  const resources = [...reuseResources].sort(
    (a, b) =>
      Number(recommendations.includes(b.id)) -
      Number(recommendations.includes(a.id)),
  );
  return (
    <section className="shell page-section">
      <Link href="/dashboard" className="back-link">
        ← Back to My loop
      </Link>
      <div className="page-intro">
        <span className="eyebrow">GIVE IT ANOTHER LOOP</span>
        <h1>Another way to pass it on.</h1>
        <p>
          Explore campus reuse options. Suggestions are starting points, not
          donation eligibility decisions.
        </p>
      </div>
      <div className="notice">
        Please check current donation guidelines and opening hours before
        bringing an item. CampusLoop does not arrange transport, guarantee
        acceptance or reserve drop-off slots, and is not affiliated with these
        services.
      </div>
      {category === "food" && (
        <p className="notice">
          A listing deadline is not a food-safety assessment. Never redistribute
          unsafe or expired food. If you cannot confirm suitability, consult the
          official guidance instead of relisting.
        </p>
      )}
      <div className="reuse-grid">
        {resources.map((resource) => (
          <article className="panel reuse-card" key={resource.id}>
            {recommendations.includes(resource.id) && (
              <span className="eyebrow">
                GUIDANCE FOR THIS CATEGORY · CHECK ELIGIBILITY
              </span>
            )}
            <h2>{resource.name}</h2>
            <p>{resource.description}</p>
            {resource.location && <p className="fine">{resource.location}</p>}
            <div className="button-row">
              <a
                className="text-link"
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${resource.name} official guidelines (opens in a new tab)`}
              >
                Official guidelines ↗
              </a>
              {resource.destination && (
                <a
                  className="text-link"
                  href={reuseDirections(resource.destination)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Walking directions to ${resource.name} (opens in a new tab)`}
                >
                  Walking directions ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="fine">
        Only completed CampusLoop handoffs count toward community impact.
        Exploring these options or relisting does not record a donation or a
        completed loop.
      </p>
    </section>
  );
}
