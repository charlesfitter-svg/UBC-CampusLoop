"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Leaf, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";
export function Header() {
  const path = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="CampusLoop home">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          campus<span>loop</span>
          <span className="ubc-tag">UBC</span>
        </Link>
        <nav className={open ? "nav open" : "nav"} aria-label="Main navigation">
          {[
            ["/", "Explore"],
            ["/impact", "Our impact"],
            ["/dashboard", "My loop"],
          ].map(([href, text]) => (
            <Link
              onClick={() => setOpen(false)}
              className={path === href ? "active" : ""}
              href={href}
              key={href}
            >
              {text}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="login-link" href={user ? "/dashboard" : "/auth"}>
            {user ? "My account" : "Log in"}
            <ArrowUpRight size={15} />
          </Link>
          <Link href="/list/new" className="button small">
            <Sparkles size={16} />
            List with AI
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
