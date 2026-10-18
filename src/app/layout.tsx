import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "CampusLoop — Good things deserve another loop",
    template: "%s · CampusLoop",
  },
  description:
    "A little less waste. A lot more community. Share food, find pre-loved treasures, and keep good things going at UBC.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <footer className="site-footer shell">
            <div>
              <Link href="/" className="brand">
                <Leaf size={20} />
                campus<span>loop</span>
              </Link>
              <p>Good for your campus. Better for the planet.</p>
            </div>
            <div className="footer-links">
              <span>Made for the UBC community</span>
              <Link href="/impact">
                Keep the good going <ArrowUpRight size={14} />
              </Link>
              <span className="fine">
                Independent student project · Not affiliated with UBC
              </span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
