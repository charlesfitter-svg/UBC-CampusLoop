"use client";
import { useClock } from "@/lib/use-clock";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Clock3,
  Coffee,
  Gift,
  Leaf,
  MapPin,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  available,
  imageUrl,
  landmarks,
  money,
  type Listing,
} from "@/lib/marketplace";
export function ListingCard({ listing: l }: { listing: Listing }) {
  const now = useClock();
  const isAvailable = available(l, now);
  return (
    <Link className="listing-card" href={`/listings/${l.id}`}>
      <div className={`card-photo ${l.category}`}>
        <img src={imageUrl(l.image_path)} alt={l.title} loading="lazy" />
        <span className="category-tag">
          {l.category === "food" ? <Coffee size={12} /> : <Package size={12} />}{" "}
          {l.subcategory}
        </span>
        <span className="card-arrow">
          <ArrowUpRight size={18} />
        </span>
        {!isAvailable && (
          <span className="unavailable-tag">
            {Date.parse(l.expires_at) <= now ? "Expired" : "Unavailable"}
          </span>
        )}
      </div>
      <div className="card-meta">
        <span>{l.seller_name}</span>
        <span>
          {l.is_demo ? "Sample listing" : l.available_quantity + " available"}
        </span>
      </div>
      <div className="card-title">
        <h3>{l.title}</h3>
        <span className={l.price_cents === 0 ? "price free" : "price"}>
          {money(l.price_cents)}
        </span>
      </div>
      <div className="card-location">
        <MapPin size={13} />
        {landmarks[l.landmark].short}
        <span>·</span>
        <Clock3 size={13} />
        {l.category === "food" ? "Pickup today" : "Campus pickup"}
      </div>
    </Link>
  );
}
export function Marketplace({
  listings,
  demo,
  error,
}: {
  listings: Listing[];
  demo: boolean;
  error?: string;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const visible = listings
    .filter(
      (l) =>
        (filter === "all" ||
          (filter === "free" ? l.price_cents === 0 : l.category === filter)) &&
        `${l.title} ${l.description} ${l.subcategory} ${landmarks[l.landmark].name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price_cents - b.price_cents
        : sort === "deadline"
          ? Date.parse(a.expires_at) - Date.parse(b.expires_at)
          : Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" /> SMALL ACTS. FULL CIRCLE.
          </span>
          <h1>
            Good things deserve
            <br />
            another <span className="serif-word">loop.</span>
            <svg
              className="hero-scribble"
              width="119"
              height="15"
              viewBox="0 0 119 15"
            >
              <path
                d="M3 10 Q55 -4 116 6 M12 14 Q65 3 105 10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p>
            Rescue a meal. Rehome a favourite. Find your next little
            <br className="desktop-break" /> thing — right here on campus.
          </p>
          <div className="hero-actions">
            <a href="#explore" className="button">
              Explore the loop <ArrowRight size={17} />
            </a>
            <Link href="/list/new" className="text-link">
              <Camera size={18} />
              Have something to share?
            </Link>
          </div>
          <div className="community-proof">
            <div className="avatar-stack">
              <span>JL</span>
              <span>MK</span>
              <span>AS</span>
              <span>
                <Leaf size={15} />
              </span>
            </div>
            <div>
              <strong>A campus full of possibilities</strong>
              <span>For students, by students. Always local.</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="hero-star star-one">✳</span>
          <span className="hero-star star-two">✳</span>
          <div className="hero-image">
            <img
              src="/images/hero.jpg"
              alt="A potted cactus ready for another home"
              fetchPriority="high"
            />
            <div className="hero-image-caption">
              <span>
                <Leaf size={14} /> LESS WASTE, MORE POSSIBILITY
              </span>
            </div>
          </div>
          <div className="floating-note note-top">
            <span className="note-icon">
              <Check size={18} />
            </span>
            <div>
              Still good.<strong>Just needs a new home.</strong>
            </div>
          </div>
          <div className="floating-note note-bottom">
            <span>↻</span>
            <div>
              A small swap.<strong>A real difference.</strong>
            </div>
            <Leaf size={22} />
          </div>
          <span className="handwritten">keep the good going ↗</span>
        </div>
      </section>
      <div className="values-strip">
        <div className="shell">
          <span>
            <MapPin size={16} />
            Your campus, your community
          </span>
          <span>
            <Gift size={17} />
            Free finds & little prices
          </span>
          <span>
            <Leaf size={16} />
            Less landfill, more life
          </span>
          <span>
            <Check size={16} />
            Easy pickup. Zero delivery.
          </span>
        </div>
      </div>
      <section className="shell explore-section" id="explore">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE CAMPUS CIRCULAR</span>
            <h2>
              Around your corner<span className="green">.</span>
            </h2>
            <p>Good food and pre-loved finds. Ready for their next chapter.</p>
          </div>
          <span className="location-pill">
            <MapPin size={15} /> UBC Vancouver
          </span>
        </div>
        <div className="market-toolbar">
          <div className="filter-tabs" aria-label="Listing category">
            {[
              ["all", "Everything", Package],
              ["food", "Food", Coffee],
              ["items", "Items", Leaf],
              ["free", "Free finds", Gift],
            ].map(([key, label, Icon]) => {
              const C = Icon as typeof Package;
              return (
                <button
                  key={key as string}
                  aria-pressed={filter === key}
                  className={filter === key ? "selected" : ""}
                  onClick={() => setFilter(key as string)}
                >
                  <C size={16} />
                  {label as string}
                </button>
              );
            })}
          </div>
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Search listings"
              placeholder="Find something good…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="results-line">
          <span>
            {visible.length} good {visible.length === 1 ? "thing" : "things"} to
            discover{" "}
            {demo && (
              <span className="demo-label">
                Preview · Fictional sample listings
              </span>
            )}
          </span>
          <label>
            <SlidersHorizontal size={13} />
            <select
              aria-label="Sort listings"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Just added</option>
              <option value="price">Lowest price</option>
              <option value="deadline">Pickup soonest</option>
            </select>
          </label>
        </div>
        {error ? (
          <div className="notice error" role="alert">
            {error} <button onClick={() => location.reload()}>Retry</button>
          </div>
        ) : visible.length ? (
          <div className="listing-grid">
            {visible.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={32} />
            <h3>No finds just yet</h3>
            <p>Try another search, or be the first to share something good.</p>
            <Link className="button" href="/list/new">
              List with AI <Sparkles size={16} />
            </Link>
          </div>
        )}
      </section>
      <section className="shell">
        <div className="ai-banner">
          <div className="ai-banner-icon">
            <Camera size={30} />
            <span>
              <Sparkles size={15} />
            </span>
          </div>
          <div>
            <span className="eyebrow">
              A PHOTO. A LITTLE AI. A NEW BEGINNING.
            </span>
            <h2>Less typing. More sharing.</h2>
            <p>Snap it. Let AI write the listing. Give it another loop.</p>
          </div>
          <Link href="/list/new" className="button light">
            <Sparkles size={17} />
            Try List with AI <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
