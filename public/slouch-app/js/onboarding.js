// onboarding.js — Posturally first-time guided tour (no deps)
// Assumes the onboarding CSS is loaded (the .onb-* classes you added).

const qs  = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STEPS = [
  { id:"startCamera", target:"#cameraToggle", title:"Start Camera",
    body:"Click <b>Start Camera</b> to begin.  You can stop the camera any time — Posturally pauses while it’s off.",
    placement:"bottom" },

  { id:"calibrate", target:"#calibrate", title:"Calibrate Posture",
    body:"Sit upright in your best posture. Make sure your <b>face and shoulders</b> are in frame, then press <b>Calibrate</b>. This sets your baseline so Posturally knows what “upright” looks like.<br><br>💡 <b>Tip:</b> After calibrating, look at the <b>Score</b> in the status bar. Decide at what score you want nudges to start, then adjust <b>Sensitivity</b> to match.",
    placement:"bottom" },

  { id:"keepActive", target:"#statusPip", title:"Keep Active (Mini-window)",
    body:"Press <b>Keep active</b> to open a mini-window so monitoring continues while you switch tabs. <i>Keep the Posturally tab open</i> in the background.",
    placement:"right" },

  // ➜ SIDE placement so it doesn’t cover the slider
  { id:"sensitivity", target:"#sensitivity", title:"Sensitivity",
    body:"Use this slider to choose how strict detection is. Higher = stricter. Set it to the <i>score</i> where you want nudges to begin.",
    placement:"right" },

  // ➜ SIDE placement so it doesn’t cover the timers
  { id:"timers", target:".timers-card", title:"Timers",
    body:"<b>Slouch timer</b>: how long you can slouch before a nudge.<br><b>Head direction</b>: how long you can look away before a nudge.",
    placement:"right" },

  // Better target for click area: the pill, not the checkbox itself
  { id:"beeper", target:".beep-toggle", title:"Beep Alert",
    body:"Toggle <b>Beep alert</b> to play a short sound when Posturally nudges you.",
    placement:"left" },

  // ➜ SIDE placement so it doesn’t cover the whole card
  { id:"statusBar", target:".status-panel", title:"Status & Guidance",
    body:"This bar shows your current status (upright, slouching, looking away) and provides guidance if you need reminders later.",
    placement:"right" },

  { id:"pipInfo", target:"#statusPip", title:"Mini-window Hints",
    body:"The mini-window will show a <b>green/red bar</b> for posture and an <b>arrow</b> to guide your head on each side. <br><br>💡 <b>Tip:</b> Tuck it to the side, keeping the color bar for nudges with minimal distraction.",
    placement:"right" },
];


const LS_KEY = "postura.onboard.done";

/* ---------- Overlay / Panel creation ---------- */
function createOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "onb-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const panel = document.createElement("div");
  panel.className = "onb-panel";
  panel.setAttribute("data-ready", "0"); // <-- add this
  panel.innerHTML = `
    <h3 class="onb-title"></h3>
    <p class="onb-body"></p>
    <div class="onb-actions">
      <button class="onb-btn onb-skip" data-action="skip" aria-label="Skip tutorial">Skip</button>
      <span class="onb-step" aria-live="polite"></span>
      <button class="onb-btn" data-action="back" aria-label="Back"><span class="onb-kbd">←</span> Back</button>
      <button class="onb-btn primary" data-action="next" aria-label="Next">Next <span class="onb-kbd">→</span></button>
    </div>
  `;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  return { overlay, panel };
}


/* ---------- Positioning ---------- */
function positionPanel(panel, target, desired = "bottom") {
  const gap = 12;                     // spacing from target
  const margin = 8;                   // screen padding
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = target.getBoundingClientRect();

  // Measure panel AFTER it's in the DOM
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;

  // How much space around the target?
  const space = {
    left:   r.left - margin,
    right:  vw - r.right - margin,
    top:    r.top - margin,
    bottom: vh - r.bottom - margin,
  };

  // Try placement order: desired first, then best available
  const order = (() => {
    const all = ["right", "left", "bottom", "top"];
    const start = [desired, ...all.filter(p => p !== desired)];
    // Rank by available space so we pick the best fallback if desired doesn't fit
    return start.sort((a, b) => space[b] - space[a]);
  })();

  let top, left, placement = desired;

  function fits(p) {
    switch (p) {
      case "left":   return space.left   >= pw + gap;
      case "right":  return space.right  >= pw + gap;
      case "top":    return space.top    >= ph + gap;
      case "bottom": return space.bottom >= ph + gap;
      default:       return false;
    }
  }

  // choose first placement that fits; otherwise we'll clamp later
  placement = order.find(fits) || order[0];

  switch (placement) {
    case "left":
      top  = r.top + r.height/2 - ph/2;
      left = r.left - pw - gap;
      break;
    case "right":
      top  = r.top + r.height/2 - ph/2;
      left = r.right + gap;
      break;
    case "top":
      top  = r.top - ph - gap;
      left = r.left + r.width/2 - pw/2;
      break;
    case "bottom":
    default:
      top  = r.bottom + gap;
      left = r.left + r.width/2 - pw/2;
      break;
  }

  // Clamp to viewport (keeps it on-screen even if nothing "fits")
  const maxL = vw - pw - margin;
  const maxT = vh - ph - margin;
  left = Math.max(margin, Math.min(left, maxL));
  top  = Math.max(margin, Math.min(top,  maxT));

  panel.style.left = `${Math.round(left + window.scrollX)}px`;
  panel.style.top  = `${Math.round(top  + window.scrollY)}px`;
}



/* ---------- Highlight helpers ---------- */
function highlight(el) {
  el.classList.add("onb-highlight");
  // Scroll to center so the highlight is visible
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}
function unhighlight(el) {
  el.classList.remove("onb-highlight");
}

/* ---------- Main tour ---------- */
function runTour() {
  const { overlay, panel } = createOverlay();
  const titleEl = panel.querySelector(".onb-title");
  const bodyEl  = panel.querySelector(".onb-body");
  const stepEl  = panel.querySelector(".onb-step");

  let i = 0;
  let currentTarget = null;
  let observing = false;

let currentPlacement = "bottom";

function render() {
  while (i < STEPS.length && !qs(STEPS[i].target)) i++;
  if (i >= STEPS.length) return end(true);

  const step = STEPS[i];
  const target = qs(step.target);

  if (currentTarget && currentTarget !== target) unhighlight(currentTarget);
  currentTarget = target;
  highlight(target);

  overlay.classList.add("is-open");

// hide while we recalc position
panel.setAttribute("data-ready", "0");

titleEl.innerHTML = step.title;
bodyEl.innerHTML  = step.body;
stepEl.textContent = `Step ${i + 1} of ${STEPS.length}`;

requestAnimationFrame(() => {
  positionPanel(panel, target, step.placement);
  panel.setAttribute("data-ready", "1"); // reveal after placement
});
}

// reflow when viewport moves/changes
const reflow = () => {
  const step = STEPS[i];
  const target = step && qs(step.target);
  if (!target) return;
  positionPanel(panel, target, currentPlacement);
};
window.addEventListener("resize", reflow, { passive: true });
window.addEventListener("scroll", reflow, { passive: true });

  function end(done = true) {
    if (currentTarget) unhighlight(currentTarget);
    if (overlay.isConnected) overlay.remove();
    if (done) localStorage.setItem(LS_KEY, "1");
    // Clean up keyboard handler
    window.removeEventListener("keydown", onKey);
  }

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const a = btn.getAttribute("data-action");
    if (a === "skip") return end(true);
    if (a === "back") { i = Math.max(0, i - 1); render(); }
    if (a === "next") {
      if (i < STEPS.length - 1) { i++; render(); }
      else end(true);
    }
  });

  function onKey(e) {
    if (!overlay.isConnected) return;
    if (e.key === "Escape") { end(false); }
    if (e.key === "ArrowLeft") { i = Math.max(0, i - 1); render(); }
    if (e.key === "ArrowRight" || e.key === "Enter") {
      if (i < STEPS.length - 1) { i++; render(); } else end(true);
    }
  }
  window.addEventListener("keydown", onKey);

  // Prevent clicking the dim area from advancing/closing
  overlay.addEventListener("click", (e) => {
    const inside = e.composedPath().includes(panel);
    if (!inside) {
      // Keep overlay open; do nothing
    }
  });

  render();
  return { end };
}

/* ---------- Boot logic ---------- */
function maybeStartTour() {
  const done = localStorage.getItem(LS_KEY) === "1";
  if (!done) runTour();
}


function bindHelp() {
  const btn = qs("#helpButton");
  if (btn) btn.addEventListener("click", () => runTour());
}

document.addEventListener("DOMContentLoaded", () => {
  bindHelp();   // ✅ now Help launches onboarding
  setTimeout(maybeStartTour, 200);
});
