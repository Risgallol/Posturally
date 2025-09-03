// components/Footer.tsx
import { Github, LinkedIn, Mail } from "lucide-react";
import { useState } from "react";
import ContactForm from "@/components/ContactForm";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="bg-neutral-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-semibold">Posturally</h3>
            <p className="mt-3 max-w-sm text-sm text-white/75">
              Privacy-first posture monitoring that helps you maintain better
              health throughout your workday.
            </p>

            {/* Contact line opens modal */}
            <p className="mt-4 text-sm">
              Questions?{" "}
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger className="underline underline-offset-4 decoration-white/40 hover:decoration-white">
                  Contact us
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg bg-neutral-950 text-white border border-white/10">
                  <DialogHeader>
                    <DialogTitle>Contact us</DialogTitle>
                    <DialogDescription className="text-white/70">
                      Fill out the form and we’ll get back to you shortly.
                    </DialogDescription>
                  </DialogHeader>
                  <ContactForm />
                </DialogContent>
              </Dialog>
              .
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
              Product
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a className="opacity-90 hover:opacity-100" href="#features">
                  Features
                </a>
              </li>
              <li>
                <a className="opacity-90 hover:opacity-100" href="#how-it-works">
                  How It Works
                </a>
              </li>
              <li>
                <a className="opacity-90 hover:opacity-100" href="#privacy">
                  Privacy
                </a>
              </li>
              <li>
                <a className="opacity-90 hover:opacity-100" href="/app">
                  Launch App
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
              Connect
            </h4>
            <div className="mt-4 flex gap-3">
              {/* Modal trigger via icon */}
              <button
                aria-label="Contact us"
                onClick={() => setOpen(true)}
                className="rounded-xl border border-white/15 p-2 hover:bg-white/5"
              >
                <Mail className="h-5 w-5" />
              </button>

              <a
                aria-label="GitHub"
                className="rounded-xl border border-white/15 p-2 hover:bg-white/5"
                href="https://github.com/Risgallol/Posturally"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>

              <a
                aria-label="LinkedIn"
                className="rounded-xl border border-white/15 p-2 hover:bg-white/5"
                href="www.linkedin.com/in/augustin-risgallah" 
                target="_blank"
                rel="noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-3 text-sm text-white/70">
              Join our community for updates and health tips.
            </p>
          </div>
        </div>

        <hr className="my-8 border-white/10" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-white/70 md:flex-row">
          <p>© {new Date().getFullYear()} Posturally. Built with privacy in mind.</p>
          <p>
            Made with <span aria-hidden>♥</span> for better health
          </p>
        </div>
      </div>
    </footer>
  );
}
