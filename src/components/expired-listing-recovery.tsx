"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import {
  localDateTime,
  recoveryDismissalKey,
  recoveryStatus,
} from "@/lib/listing-recovery";
import { reuseLink } from "@/lib/reuse";
import {
  validateDeadline,
  type Listing,
  type Reservation,
} from "@/lib/marketplace";

export function ExpiredListingRecovery({
  listing,
  owner,
  reservations,
  now,
  onRelisted,
}: {
  listing: Listing;
  owner: string;
  reservations: Reservation[];
  now: number;
  onRelisted: () => Promise<void>;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [foodDetails, setFoodDetails] = useState(listing.food_details ?? "");
  const [foodConfirmed, setFoodConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const deadlineInput = useRef<HTMLInputElement>(null);
  const status = recoveryStatus(listing, owner, reservations, now);
  useEffect(() => {
    // Synchronize dismissal only on entering My Listings or refreshed listing /
    // reservation data, not when the clock reaches the expiration time.
    const eligibleOnReturn =
      recoveryStatus(listing, owner, reservations) === "ready";
    let dismissed = false;
    try {
      dismissed =
        localStorage.getItem(recoveryDismissalKey(listing)) === "dismissed";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser dismissal state with loaded account data.
    setShowPrompt(eligibleOnReturn && !dismissed);
  }, [listing, owner, reservations]);
  function dismiss() {
    setShowPrompt(false);
    try {
      localStorage.setItem(recoveryDismissalKey(listing), "dismissed");
    } catch {}
  }
  async function relist(event: FormEvent) {
    event.preventDefault();
    if (pending.current || status !== "ready") return;
    setError("");
    try {
      const expires = new Date(deadline).toISOString();
      const problem = validateDeadline(expires, listing.category);
      if (problem) throw new Error(problem);
      if (
        listing.category === "food" &&
        (!foodConfirmed || foodDetails.trim().length < 5)
      )
        throw new Error(
          "Renew your food details and confirm suitability before relisting.",
        );
      pending.current = true;
      setBusy(true);
      const { error } = await browserSupabase().rpc("relist_listing", {
        p_id: listing.id,
        p_expires_at: expires,
        p_food_confirmed: foodConfirmed,
        p_food_details: listing.category === "food" ? foodDetails.trim() : null,
      });
      if (error) throw error;
      setEditing(false);
      setShowPrompt(false);
      await onRelisted();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!status) return null;
  return (
    <div className="listing-recovery">
      {showPrompt && status === "ready" && (
        <div className="recovery-prompt">
          <h3>Still looking for a new home?</h3>
          <p>
            Your listing has expired, but it doesn’t have to go to waste. Give
            it another chance on CampusLoop or explore local reuse options.
          </p>
          <button className="text-link" onClick={dismiss}>
            Not now
          </button>
        </div>
      )}
      {status === "reserved" && (
        <p>
          Finish or cancel outstanding reservations before relisting. Existing
          pickup codes still work after the listing deadline.
        </p>
      )}
      <div className="button-row">
        {status === "ready" && (
          <button
            className="button secondary small"
            disabled={busy}
            aria-expanded={editing}
            onClick={() => {
              setEditing(true);
              requestAnimationFrame(() => deadlineInput.current?.focus());
            }}
          >
            Relist item
          </button>
        )}
        <Link className="text-link" href={reuseLink(listing)}>
          Explore reuse options
        </Link>
      </div>
      {editing && status === "ready" && (
        <form
          className="relist-form"
          onSubmit={relist}
          aria-label={`Relist ${listing.title}`}
        >
          <p>
            Keep this listing and photograph. Choose a new deadline; quantities,
            prices and completed pickups stay unchanged.
          </p>
          <label>
            New pickup deadline
            <input
              ref={deadlineInput}
              type="datetime-local"
              required
              value={deadline}
              min={now ? localDateTime(now) : undefined}
              max={
                now
                  ? localDateTime(
                      now + (listing.category === "food" ? 2 : 31) * 86400000,
                    )
                  : undefined
              }
              onChange={(event) => setDeadline(event.target.value)}
              disabled={busy}
            />
            <small>
              Your device’s local time.{" "}
              {listing.category === "food"
                ? "Within 48 hours."
                : "Within 31 days."}
            </small>
          </label>
          {listing.category === "food" && (
            <>
              <label>
                Renewed food details
                <textarea
                  required
                  minLength={5}
                  maxLength={800}
                  value={foodDetails}
                  onChange={(event) => setFoodDetails(event.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={foodConfirmed}
                  onChange={(event) => setFoodConfirmed(event.target.checked)}
                  disabled={busy}
                />
                I have rechecked contents, allergens and handling, and confirm
                this food is still suitable for redistribution. I am not
                relisting unsafe or expired food.
              </label>
              <p className="fine">
                If you cannot confirm this, use the reuse guidance above
                instead.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="button small" disabled={busy}>
              {busy ? "Relisting…" : "Confirm new deadline"}
            </button>
            <button
              className="button secondary small"
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setFoodConfirmed(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
