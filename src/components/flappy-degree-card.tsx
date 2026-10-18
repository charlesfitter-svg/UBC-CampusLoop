"use client";

import { ArrowUpRight, Gamepad2 } from "lucide-react";
import { flappyDegreeUrl, openFlappyDegree } from "@/lib/flappy-degree";
import type { Reservation } from "@/lib/marketplace";

type FlappyDegreeCardProps = {
  reservationStatus: Reservation["status"];
  isBuyerPickup: boolean;
};

export function FlappyDegreeCard({
  reservationStatus,
  isBuyerPickup,
}: FlappyDegreeCardProps) {
  const url = flappyDegreeUrl(process.env.NEXT_PUBLIC_FLAPPY_DEGREE_URL);
  if (!isBuyerPickup || reservationStatus !== "reserved" || !url) return null;

  return (
    <aside className="flappy-degree-card" aria-label="Play while you wait">
      <Gamepad2 size={22} aria-hidden="true" />
      <div className="flappy-degree-content">
        <h4>Waiting for your pickup?</h4>
        <p>
          Survive your degree while you wait. Three lives, one Thunderbird, and
          a mountain of prerequisites.
        </p>
        <div className="flappy-degree-actions">
          <button
            type="button"
            className="button small"
            aria-label="Play Flappy Degree (opens in a separate window or tab)"
            onClick={() => openFlappyDegree(url)}
          >
            Play Flappy Degree <ArrowUpRight size={15} aria-hidden="true" />
          </button>
          <a
            className="text-link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            Open in a new tab instead
            <span className="sr-only"> (external game)</span>
          </a>
        </div>
        <p className="fine">
          Optional. Your pickup stays open here. Pop-up blocked? Use the link
          above.
        </p>
      </div>
    </aside>
  );
}
