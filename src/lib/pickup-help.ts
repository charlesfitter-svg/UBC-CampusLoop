import { landmarks, type Landmark } from "./marketplace";

export const pickupServices = [
  {
    name: "AMS Safewalk",
    phone: "604-822-5355",
    href: "https://www.ams.ubc.ca/support-services/student-services/safewalk/",
    description:
      "Campus walking accompaniment during published operating hours. Check current hours before calling.",
  },
  {
    name: "UBC Campus Security",
    phone: "604-822-2222",
    href: "https://communitysafety.ubc.ca/",
    description: "24/7 campus security assistance. Call 911 for emergencies.",
  },
  {
    name: "UBC Accessibility Shuttle",
    phone: "604-822-9929",
    href: "https://students.ubc.ca/about-student-services/centre-for-accessibility/ubc-accessibility-shuttle/",
    description:
      "Mobility assistance at designated stops with advance bookings, subject to availability. Not on-demand transport, delivery or instant pickup.",
  },
] as const;

export const telephone = (phone: string) => `tel:+1${phone.replace(/\D/g, "")}`;

export function pickupMapUrl(landmark: Landmark, apiKey: string | undefined) {
  if (!apiKey?.trim() || !Object.hasOwn(landmarks, landmark)) return null;
  const location = landmarks[landmark];
  const url = new URL("https://www.google.com/maps/embed/v1/place");
  url.searchParams.set("key", apiKey.trim());
  url.searchParams.set("q", `${location.lat},${location.lng}`);
  return url.toString();
}
