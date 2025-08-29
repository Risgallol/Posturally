import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function PosturaHeaderLanding() {
  const ref = useRef<HTMLElement>(null);

  // Measure header height and expose it as a CSS variable for scroll-margin-top
  useEffect(() => {
    const setVar = () => {
      if (ref.current) {
        document.documentElement.style.setProperty(
          "--header-h",
          `${ref.current.offsetHeight}px`
        );
      }
    };
    setVar();
    // update on resize & when fonts load
    window.addEventListener("resize", setVar);
    document.fonts?.addEventListener?.("loadingdone", setVar as EventListener);

    return () => {
      window.removeEventListener("resize", setVar);
      document.fonts?.removeEventListener?.("loadingdone", setVar as EventListener);
    };
  }, []);

  return (
    <header ref={ref} className="relative w-full overflow-hidden sticky top-0 z-50">
      {/* exact same gradient feel as hero */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-gradient-hero opacity-95" />

      <div className="relative z-10 container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Brand */}
          <h1
            className="m-0 font-extrabold leading-none text-white"
            style={{ fontSize: "clamp(28px, 3.5vw, 36px)" }}
          >
            Posturally
          </h1>

          {/* Nav (desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#product" className="text-white/90 hover:text-white transition">
              Product
            </a>
            <a href="#features" className="text-white/90 hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="text-white/90 hover:text-white transition">
              How It Works
            </a>
            <a href="#privacy" className="text-white/90 hover:text-white transition">
              Privacy
            </a>
            <Link
              to="/app"
              className="ml-2 inline-flex items-center rounded-full px-4 py-2 text-white bg-white/15 hover:bg-white/25 border border-white/20 transition"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
