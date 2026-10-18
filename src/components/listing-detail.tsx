"use client";
import { useRouter } from "next/navigation";
import { useClock } from "@/lib/use-clock";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Leaf,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { browserSupabase } from "@/lib/supabase/client";
import {
  available,
  deadlineLabel,
  directions,
  imageUrl,
  landmarks,
  money,
  type Listing,
} from "@/lib/marketplace";
export function ListingDetail({ listing: l }: { listing: Listing }) {
  const router = useRouter();
  const now = useClock();
  const { user, loading } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const [current, setCurrent] = useState(l);
  async function reserve() {
    setBusy(true);
    setError("");
    try {
      key.current ??= crypto.randomUUID();
      const db = browserSupabase();
      const { data, error } = await db.rpc("reserve_listing", {
        p_listing: l.id,
        p_quantity: quantity,
        p_key: key.current,
      });
      if (error) throw error;
      router.push(`/dashboard?reservation=${data}`);
    } catch (e) {
      setError((e as Error).message);
      const { data } = await browserSupabase()
        .from("listings")
        .select("*")
        .eq("id", l.id)
        .single();
      if (data) setCurrent(data as Listing);
    } finally {
      setBusy(false);
    }
  }
  const isOwner = user?.id === l.seller_id;
  const good = available(current, now);
  return (
    <section className="shell page-section">
      <Link href="/#explore" className="back-link">
        <ArrowLeft size={16} />
        Back to the good stuff
      </Link>
      {l.is_demo && (
        <div className="notice">
          Fictional sample listing · This shows the experience. Samples cannot
          be reserved and never count toward impact.
        </div>
      )}
      <div className="detail-layout">
        <div>
          <div className={`detail-photo ${l.category}`}>
            <img src={imageUrl(l.image_path)} alt={l.title} />
            <span className="category-tag">{l.subcategory}</span>
          </div>
          <div className="seller-card">
            <span className="avatar">{l.seller_name.slice(0, 1)}</span>
            <div>
              <strong>{l.seller_name}</strong>
              <p>Your campus neighbour</p>
            </div>
            <Leaf size={22} />
          </div>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">GOOD THINGS, ANOTHER CHAPTER</span>
          <h1>{l.title}</h1>
          <div className="detail-price">
            <span className={l.price_cents === 0 ? "free" : ""}>
              {money(l.price_cents)}
            </span>
            <small>
              {l.price_cents === 0
                ? "A little kindness, on the house."
                : "CAD per unit · Pay at pickup"}
            </small>
          </div>
          <p className="description">{l.description}</p>
          <div className="detail-facts">
            <div>
              <MapPin />
              <span>
                <strong>{landmarks[l.landmark].name}</strong>
                <small>{landmarks[l.landmark].note}</small>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <strong>Pickup by {deadlineLabel(l.expires_at)}</strong>
                <small>
                  {current.available_quantity} of {l.quantity} available
                </small>
              </span>
            </div>
          </div>
          {l.category === "food" && (
            <div className="notice">
              <strong>Seller-provided food information</strong>
              <p>{l.food_details}</p>
              <small>
                Ask the seller about anything uncertain. CampusLoop cannot
                verify food safety or allergens.
              </small>
            </div>
          )}
          {isOwner ? (
            <div className="panel">
              <h3>This one’s yours</h3>
              <p>Manage the listing or confirm pickups in My loop.</p>
              <div className="button-row">
                <Link className="button" href={`/listings/${l.id}/edit`}>
                  Edit listing
                </Link>
                <Link className="button secondary" href="/dashboard">
                  My loop
                </Link>
              </div>
            </div>
          ) : (
            <div className="reservation-panel">
              <h3>
                {!good
                  ? "This one has found its next chapter."
                  : "Make it part of your loop."}
              </h3>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              {good && (
                <>
                  <p>
                    {l.price_cents === 0
                      ? "Reserve it for free and meet your neighbour on campus."
                      : "Reserve now. Pay the seller directly when you meet — no online charge."}
                  </p>
                  {current.available_quantity > 1 && (
                    <label>
                      How many?
                      <select
                        aria-label="Reservation quantity"
                        value={quantity}
                        disabled={busy}
                        onChange={(e) => {
                          setQuantity(Number(e.target.value));
                          key.current = null;
                        }}
                      >
                        {Array.from(
                          { length: current.available_quantity },
                          (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                  {user ? (
                    <button
                      className="button full"
                      disabled={busy || loading || l.is_demo}
                      onClick={reserve}
                    >
                      {l.is_demo
                        ? "Sample · Preview only"
                        : busy
                          ? "Saving your spot…"
                          : l.price_cents === 0
                            ? "Reserve for free"
                            : `Reserve — Pay at pickup${quantity > 1 ? " · " + money(l.price_cents * quantity) : ""}`}
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <Link
                      className="button full"
                      href={`/auth?next=/listings/${l.id}`}
                    >
                      Log in to reserve <ArrowRight size={17} />
                    </Link>
                  )}
                  <span className="fine">
                    <ShieldCheck size={13} />
                    Pickup code keeps your handoff simple and secure.
                  </span>
                </>
              )}
              {!good && (
                <p>
                  {current.status === "removed"
                    ? "The seller removed this listing."
                    : Date.parse(current.expires_at) <= now
                      ? "The pickup deadline has passed."
                      : "All available units have been reserved."}
                </p>
              )}
            </div>
          )}
          <a
            className="button secondary full"
            href={directions(l.landmark)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation size={17} />
            Get walking directions
          </a>
          <p className="fine">
            <Check size={13} />
            Meet at a public landmark. Check your item before handoff.
          </p>
        </div>
      </div>
    </section>
  );
}
