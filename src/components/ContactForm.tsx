// components/ContactForm.tsx
import * as React from "react";

const ENDPOINT = "https://formspree.io/f/mandnqbk"; // your Formspree endpoint

type Status = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  // Optional: capture current page as context
  const pageRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (pageRef.current) pageRef.current.value = window.location.href;
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot spam trap: if filled, silently "succeed"
    if ((data.get("company") as string)?.length) {
      setStatus("success");
      form.reset();
      return;
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });

      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const j = await res.json().catch(() => null);
        setError(j?.errors?.[0]?.message || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Hidden: page context for you to see later */}
      <input ref={pageRef} type="hidden" name="page" value="" />
      {/* Hidden: subject (shows up in Formspree) */}
      <input type="hidden" name="_subject" value="New message from Slouch Detector" />
      {/* Honeypot: bots will fill this, humans won't */}
      <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          name="name"
          required
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Your name"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium">Message</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="How can we help?"
        />
      </div>

      <div className="flex items-center gap-2">
        <input id="consent" name="consent" type="checkbox" required />
        <label htmlFor="consent" className="text-sm">
          I agree to be contacted about this inquiry.
        </label>
      </div>

      {/* Status messages (ARIA live for screen readers) */}
      <div aria-live="polite" className="min-h-[1.25rem]">
        {status === "error" && <p className="text-sm text-red-400">{error}</p>}
        {status === "success" && (
          <p className="text-sm text-green-400">Thanks! We received your message.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:bg-[hsl(var(--primary-hover))] disabled:opacity-50"
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
