"use client";
import { useRouter } from "next/navigation";
import { useClock } from "@/lib/use-clock";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ClipboardList,
  Edit3,
  Leaf,
  LogOut,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { backendConfigured, browserSupabase } from "@/lib/supabase/client";
import {
  deadlineLabel,
  directions,
  imageUrl,
  landmarks,
  money,
  type Listing,
  type Reservation,
  type Landmark,
} from "@/lib/marketplace";
export default function Dashboard() {
  const router = useRouter();
  const now = useClock();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("pickups");
  const [listings, setListings] = useState<Listing[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [name, setName] = useState("");
  const [landmark, setLandmark] = useState<Landmark>("nest");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [fetching, setFetching] = useState(true);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setError("");
    try {
      const db = browserSupabase();
      const [ls, rs, profile, secrets] = await Promise.all([
        db
          .from("listings")
          .select("*")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false }),
        db
          .from("reservations")
          .select("*")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("created_at", { ascending: false }),
        db.from("profiles").select("*").eq("id", user.id).single(),
        db
          .from("pickup_secrets")
          .select("reservation_id,code")
          .eq("buyer_id", user.id),
      ]);
      for (const result of [ls, rs, profile, secrets])
        if (result.error) throw result.error;
      const ids = [...new Set((rs.data ?? []).map((r) => r.listing_id))];
      const related = ids.length
        ? await db.from("listings").select("*").in("id", ids)
        : { data: [], error: null };
      if (related.error) throw related.error;
      // Removed listings are private; reservations still retain quantities and payment terms.
      setListings(ls.data as Listing[]);
      setReservations(
        (rs.data ?? []).map((r) => ({
          ...r,
          listing: related.data?.find((l) => l.id === r.listing_id),
          code: secrets.data?.find((s) => s.reservation_id === r.id)?.code,
        })) as Reservation[],
      );
      if (profile.data) {
        setName(profile.data.display_name);
        setLandmark(profile.data.preferred_landmark);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }, [user]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial network fetch synchronizes external account data.
    load();
  }, [load]);
  // Refresh after returning to this tab; deadline correctness is enforced in the database.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [load]);
  async function action(id: string, kind: "cancel" | "complete" | "remove") {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const db = browserSupabase();
      const res =
        kind === "cancel"
          ? await db.rpc("cancel_reservation", { p_id: id })
          : kind === "remove"
            ? await db.rpc("remove_listing", { p_id: id })
            : await db.rpc("complete_pickup", {
                p_id: id,
                p_code: codes[id] ?? "",
              });
      if (res.error) throw res.error;
      if (kind === "complete" && !res.data)
        throw new Error(
          "That code didn’t match. Ask the buyer to read their 8-character pickup code.",
        );
      setMessage(
        kind === "complete"
          ? "Pickup completed. Another good thing kept in the loop!"
          : kind === "remove"
            ? "Listing removed. Existing reservations still need to be fulfilled or cancelled."
            : "Reservation cancelled. Inventory has been returned.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy("profile");
    setError("");
    try {
      const db = browserSupabase();
      const { error } = await db
        .from("profiles")
        .update({ display_name: name.trim(), preferred_landmark: landmark })
        .eq("id", user!.id);
      if (error) throw error;
      if (password) {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
      }
      localStorage.setItem("campusloop-landmark", landmark);
      setMessage("Profile saved. New listings will use these details.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (loading)
    return (
      <section className="shell page-section">
        <p role="status">Opening your loop…</p>
      </section>
    );
  if (!user)
    return (
      <section className="shell page-section empty-state">
        <span className="mini-icon">
          <Leaf />
        </span>
        <h1>Your loop starts here.</h1>
        <p>Log in to see your finds, manage listings and confirm pickups.</p>
        {!backendConfigured() && (
          <div className="notice">
            Accounts are unavailable in preview mode. Configure Supabase to use
            the connected marketplace.
          </div>
        )}
        <Link className="button" href="/auth">
          Join or log in
        </Link>
      </section>
    );
  const mine = reservations.filter((r) => r.buyer_id === user.id);
  const sold = reservations.filter((r) => r.seller_id === user.id);
  return (
    <section className="shell page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR CORNER OF CAMPUS</span>
          <h1>
            Hey, {name || "neighbour"}
            <span className="green">.</span>
          </h1>
          <p>
            A little sharing. A few good finds. All your loops in one place.
          </p>
        </div>
        <Link className="button" href="/list/new">
          <Sparkles size={16} />
          List with AI
        </Link>
      </div>
      <div className="dashboard-stats">
        <div>
          <Package />
          <strong>
            {listings.filter((l) => l.status === "active").length}
          </strong>
          <span>Your listings</span>
        </div>
        <div>
          <ClipboardList />
          <strong>{mine.filter((r) => r.status === "reserved").length}</strong>
          <span>Upcoming pickups</span>
        </div>
        <div>
          <Leaf />
          <strong>
            {reservations.filter((r) => r.status === "completed").length}
          </strong>
          <span>Loops completed</span>
        </div>
      </div>
      <div className="dashboard-nav">
        {[
          ["pickups", "My pickups"],
          ["listings", "My listings"],
          ["seller", "Seller handoffs"],
          ["profile", "Profile"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={tab === id ? "selected" : ""}
          >
            {label}
          </button>
        ))}
        <button
          className="refresh-button"
          onClick={load}
          disabled={fetching}
          aria-label="Refresh dashboard"
        >
          <RefreshCw size={16} className={fetching ? "spin" : ""} />
        </button>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      {fetching && (
        <p role="status" className="fine">
          Refreshing your loop…
        </p>
      )}
      {(tab === "pickups" || tab === "seller") && (
        <div className="reservation-list">
          {(tab === "pickups" ? mine : sold).map((r) => (
            <article
              className="panel reservation-card"
              key={r.id}
              id={`reservation-${r.id}`}
            >
              <div className="reservation-top">
                {r.listing && (
                  <Link href={`/listings/${r.listing_id}`}>
                    <img
                      src={imageUrl(r.listing.image_path)}
                      alt={r.listing.title}
                    />
                  </Link>
                )}
                <div>
                  <span className={`status-pill ${r.status}`}>
                    {r.status === "reserved"
                      ? "Ready to pick up"
                      : r.status === "completed"
                        ? "Loop completed"
                        : "Cancelled"}
                  </span>
                  <h3>{r.listing?.title ?? "Removed listing"}</h3>
                  <p>
                    {r.quantity} × {money(r.unit_price_cents)}{" "}
                    {r.unit_price_cents > 0 &&
                      `· ${money(r.quantity * r.unit_price_cents)} total, pay at pickup`}
                  </p>
                  <span className="fine">
                    Reservation {r.id.slice(0, 8)} ·{" "}
                    {deadlineLabel(r.created_at)}
                  </span>
                </div>
              </div>
              {r.status === "reserved" && (
                <>
                  <div className="pickup-details">
                    {tab === "pickups" ? (
                      <div className="pickup-code">
                        <span>Your pickup code</span>
                        <strong>{r.code ?? "Unavailable"}</strong>
                        <small>
                          Show the seller when you meet. Only they can confirm
                          the handoff.
                        </small>
                      </div>
                    ) : (
                      <div className="confirm-pickup">
                        <label>
                          Buyer’s pickup code
                          <input
                            maxLength={8}
                            minLength={8}
                            placeholder="8-character code"
                            value={codes[r.id] ?? ""}
                            autoComplete="off"
                            onChange={(e) =>
                              setCodes((c) => ({
                                ...c,
                                [r.id]: e.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </label>
                        <button
                          className="button"
                          disabled={!!busy || (codes[r.id]?.length ?? 0) !== 8}
                          onClick={() => action(r.id, "complete")}
                        >
                          <Check size={16} />
                          Confirm handoff
                        </button>
                        <small>
                          Confirm only after the item and any pickup payment
                          have been exchanged.
                        </small>
                      </div>
                    )}
                    {r.listing && (
                      <div className="pickup-location">
                        <p>
                          <MapPin size={15} />
                          {landmarks[r.listing.landmark].name}
                        </p>
                        <span className="fine">
                          By {deadlineLabel(r.listing.expires_at)}
                        </span>
                        <a
                          className="text-link"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={directions(r.listing.landmark)}
                        >
                          <Navigation size={15} />
                          Get directions
                        </a>
                      </div>
                    )}
                  </div>
                  <button
                    className="danger-link"
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        confirm(
                          "Cancel this reservation and return its quantity to the listing?",
                        )
                      )
                        action(r.id, "cancel");
                    }}
                  >
                    Cancel reservation
                  </button>
                </>
              )}
              {r.status === "completed" && (
                <p className="completed-note">
                  <Leaf size={15} />
                  Pickup confirmed{" "}
                  {r.completed_at && deadlineLabel(r.completed_at)}.{" "}
                  {r.listing?.is_demo
                    ? "Sample activity is excluded from community impact."
                    : "Thanks for keeping it in the loop."}
                </p>
              )}
            </article>
          ))}
          {!(tab === "pickups" ? mine : sold).length && !fetching && (
            <div className="empty-state">
              <Package size={32} />
              <h3>
                {tab === "pickups"
                  ? "Your next good find is out there."
                  : "No handoffs to manage yet."}
              </h3>
              <p>
                {tab === "pickups"
                  ? "Reserve something you love, then meet on campus."
                  : "When a neighbour reserves your listing, it’ll appear here."}
              </p>
              <Link
                className="button"
                href={tab === "pickups" ? "/" : "/list/new"}
              >
                {tab === "pickups" ? "Explore the loop" : "Share something"}
              </Link>
            </div>
          )}
        </div>
      )}
      {tab === "listings" && (
        <div className="owned-listings">
          {listings.map((l) => (
            <article className="panel owned-card" key={l.id}>
              <img src={imageUrl(l.image_path)} alt={l.title} />
              <div>
                <span className="fine">
                  {l.status === "removed"
                    ? "Removed"
                    : Date.parse(l.expires_at) < now
                      ? "Expired"
                      : `${l.available_quantity} available`}
                </span>
                <Link href={`/listings/${l.id}`}>
                  <h3>{l.title}</h3>
                </Link>
                <p>
                  {money(l.price_cents)} · {landmarks[l.landmark].short}
                </p>
              </div>
              {l.status === "active" && (
                <div className="button-row">
                  {!l.is_demo && (
                    <Link
                      className="button secondary small"
                      href={`/listings/${l.id}/edit`}
                    >
                      <Edit3 size={14} />
                      Edit
                    </Link>
                  )}
                  <button
                    className="icon-button danger-link"
                    aria-label={`Remove ${l.title}`}
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        confirm(
                          "Remove this listing? Existing reservations remain manageable.",
                        )
                      )
                        action(l.id, "remove");
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </article>
          ))}
          {!listings.length && !fetching && (
            <div className="empty-state">
              <Leaf size={32} />
              <h3>Something to share?</h3>
              <p>Your first listing is just a photo away.</p>
              <Link className="button" href="/list/new">
                List with AI
              </Link>
            </div>
          )}
        </div>
      )}
      {tab === "profile" && (
        <form className="panel profile-form" onSubmit={saveProfile}>
          <h2>Your campus identity</h2>
          <label>
            Display name
            <input
              required
              minLength={1}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Usual pickup spot
            <select
              value={landmark}
              onChange={(e) => setLandmark(e.target.value as Landmark)}
            >
              {Object.entries(landmarks).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email address
            <input value={user.email ?? ""} disabled />
            <small>Private. Your email is never shown on listings.</small>
          </label>
          <label>
            New password (optional)
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty to keep your password"
            />
          </label>
          <button className="button" disabled={!!busy}>
            Save profile
          </button>
          <button
            type="button"
            className="text-link"
            onClick={async () => {
              await browserSupabase().auth.signOut();
              router.push("/");
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </form>
      )}
    </section>
  );
}
