import Link from "next/link";
export default function NotFound() {
  return (
    <div className="shell page-section empty-state">
      <h1>This one’s out of the loop.</h1>
      <p>We couldn’t find that listing or page. It may have been removed.</p>
      <Link className="button" href="/">
        Explore more finds
      </Link>
    </div>
  );
}
