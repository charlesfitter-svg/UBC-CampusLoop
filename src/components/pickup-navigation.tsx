"use client";
import { useState } from "react";
import { Navigation } from "lucide-react";
import { directions, landmarks, type Landmark } from "@/lib/marketplace";
import { pickupMapUrl } from "@/lib/pickup-help";
import { SafetyAccessibility } from "./safety-accessibility";

export function PickupNavigation({ landmark }: { landmark: Landmark }) {
  const [mapFailed, setMapFailed] = useState(false);
  const map = pickupMapUrl(
    landmark,
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
  );
  return (
    <div className="pickup-navigation">
      <a
        className="button secondary full"
        href={directions(landmark)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Navigation size={17} /> Get walking directions
      </a>
      {map && (
        <details className="pickup-assistance">
          <summary>Preview pickup map</summary>
          {mapFailed ? (
            <p className="assistance-content" role="status">
              Map unavailable. Use the walking directions above.
            </p>
          ) : (
            <iframe
              className="pickup-map"
              title={`Pickup map: ${landmarks[landmark].name}`}
              src={map}
              width="600"
              height="260"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onError={() => setMapFailed(true)}
            />
          )}
          <p className="fine assistance-content">
            {landmarks[landmark].name}. If the map does not load, walking
            directions remain available above. Map provided by Google.
          </p>
        </details>
      )}
      <SafetyAccessibility />
    </div>
  );
}
