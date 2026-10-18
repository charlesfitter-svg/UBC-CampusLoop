import Link from "next/link";
import {
  ArrowRight,
  Check,
  Coffee,
  HeartHandshake,
  Leaf,
  Package,
  Sparkles,
} from "lucide-react";
import { serverSupabase } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Our impact" };
export default async function Impact() {
  const db = await serverSupabase();
  const response = db ? await db.rpc("impact_totals") : null;
  const totals = response?.data as {
    pickups: number;
    food: number;
    items: number;
  } | null;
  const count = totals ?? { pickups: 0, food: 0, items: 0 };
  return (
    <section className="shell page-section impact-page">
      <div className="impact-hero">
        <span className="eyebrow">
          <Leaf size={14} /> SMALL ACTIONS. SHARED IMPACT.
        </span>
        <h1>
          A little goes
          <br />
          <em>a long way.</em>
        </h1>
        <p>
          Every meal shared. Every item rehomed.
          <br />
          It all adds up to a campus that cares.
        </p>
        <span className="impact-orbit">
          <Leaf size={85} />
        </span>
      </div>
      {!db && (
        <div className="notice">
          Preview mode · No live activity is connected. Sample listings never
          count toward these totals.
        </div>
      )}
      {response?.error && (
        <div className="notice error">
          Impact couldn’t load. Check database configuration and try again.
        </div>
      )}
      <div className="impact-grid">
        {[
          [
            Coffee,
            count.food,
            "Food portions shared",
            "Good meals, enjoyed instead of wasted.",
          ],
          [
            Package,
            count.items,
            "Items given another life",
            "Pre-loved things. Brand-new beginnings.",
          ],
          [
            HeartHandshake,
            count.pickups,
            "Loops completed",
            "Real handoffs between campus neighbours.",
          ],
        ].map(([Icon, value, title, subtitle]) => {
          const C = Icon as typeof Leaf;
          return (
            <div className="impact-stat" key={String(title)}>
              <C size={25} />
              <strong>
                {response?.error ? "—" : Number(value).toLocaleString()}
              </strong>
              <h2>{String(title)}</h2>
              <p>{String(subtitle)}</p>
            </div>
          );
        })}
      </div>
      <div className="impact-explanation">
        <div>
          <span className="eyebrow">REAL ACTIONS, HONEST NUMBERS</span>
          <h2>
            Good doesn’t need
            <br />
            to be exaggerated.
          </h2>
        </div>
        <div>
          <p>
            These totals count completed pickups recorded through CampusLoop. A
            reservation only counts after the seller confirms the buyer’s pickup
            code.
          </p>
          <ul className="check-list">
            <li>
              <Check size={17} />
              Cancelled reservations don’t count.
            </li>
            <li>
              <Check size={17} />
              Fictional demo listings are excluded.
            </li>
            <li>
              <Check size={17} />
              No unverified carbon or waste estimates.
            </li>
            <li>
              <Check size={17} />
              Each completed handoff is counted once.
            </li>
          </ul>
          <p className="fine">
            Counts describe activity recorded in the app, not independently
            audited environmental outcomes. Food portions and item units use the
            seller’s listed quantities.
          </p>
        </div>
      </div>
      <div className="ai-banner">
        <Sparkles size={35} />
        <div>
          <h2>Your next small act starts here.</h2>
          <p>Something on your shelf could be someone’s favourite find.</p>
        </div>
        <Link className="button light" href="/list/new">
          Give it another loop <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
