// pip-overlay.js (double 20px side bars + black glyphs; Direction top, Status center, Posturally bottom)
export function createPipOverlay({
  postureEl,
  directionEl,
  pipVideoEl,
  buttonEl,
  width = 260,
  height = 140,
  fps = 12
}) {
  console.log("pip-overlay v2025-08-27b"); // cache-bust sanity

  // DPR + canvas
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const PX = (px) => Math.round(px * dpr);

  // --- runtime-configured hold (shared with beep UI) ---
  const holdEl = document.getElementById("hold");
  let holdMs = (Number(holdEl?.value) || 30) * 1000; // default 30s
  holdEl?.addEventListener("input", () => {
    const v = Math.max(0, Number(holdEl.value) || 0);
    holdMs = v * 1000;
  });

  // Loop state
  let running = false;
  let rafId = null;
  let lastFrameTime = 0;
  const frameInterval = 1000 / fps;

  // Slouch gating state
  let slouchStartMs = null;
  let gatedColorState = "UPRIGHT"; // what the bars use

  // Helpers
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  };
  const parsePosture = (txt) => {
    if (!txt) return "UNKNOWN";
    if (/slouch/i.test(txt)) return "SLOUCHED";
    if (/upright/i.test(txt)) return "UPRIGHT";
    return "UNKNOWN";
  };
  const colorForState = (state) => {
    const ok   = cssVar("--success", "hsl(142 76% 45%)"); // green
    const bad  = cssVar("--error",   "hsl(0 84% 60%)");   // red
    const warn = cssVar("--warning", "hsl(38 92% 50%)");  // amber (camera off / unknown)
    return state === "UPRIGHT" ? ok : state === "SLOUCHED" ? bad : warn;
  };

  function draw() {
    const w = canvas.width;
    const h = canvas.height;

    // Design tokens
    const bg      = cssVar("--background", "#FFFFFF");
    const border  = cssVar("--border",     "#E5E7EB");
    const title   = cssVar("--primary",    "#0EA5E9");
    const text    = cssVar("--foreground", "#0B1220");
    const muted   = cssVar("--muted-foreground", "#6B7280");

    // Resolve texts (with safe fallbacks if refs ever swap)
    const postureTxt   = (postureEl?.textContent ?? document.getElementById("postureMsg")?.textContent ?? "").trim();
    const rawState     = parsePosture(postureTxt); // immediate state
    const directionRaw = (directionEl?.textContent ?? document.getElementById("directionMsg")?.textContent ?? "").trim();
    const directionTxt = directionRaw.replace(/^Direction:\s*/i, "");
    const dirGlyph     = /right/i.test(directionTxt) ? "←" //shows opposite direction
                        : /left/i.test(directionTxt)  ? "→"
                        : "•";

    // Gate BAR COLOR using the same hold as the beep UI
    const nowMs = performance.now();
    if (rawState === "SLOUCHED") {
      if (slouchStartMs == null) slouchStartMs = nowMs;
      gatedColorState = (nowMs - slouchStartMs >= holdMs) ? "SLOUCHED" : "UPRIGHT";
    } else if (rawState === "UPRIGHT") {
      slouchStartMs = null;
      gatedColorState = "UPRIGHT";
    } else {
      slouchStartMs = null;
      if (gatedColorState !== "SLOUCHED") gatedColorState = "UNKNOWN";
    }

    // Clear + card bg
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Hairline border
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - dpr, h - dpr);

    // --- Side bars (20px, full height) ---
    const barColor = colorForState(gatedColorState);
    const barW = PX(20);
    ctx.fillStyle = barColor;
    ctx.fillRect(0, 0, barW, h);         // left
    ctx.fillRect(w - barW, 0, barW, h);  // right

    // --- Direction glyphs in bars (black) ---
    ctx.save();
    ctx.fillStyle = "#000"; // black glyphs
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${PX(16)}px ui-sans-serif, -apple-system, Segoe UI, Roboto, Inter, Helvetica, Arial`;
    const leftCx  = barW / 2;
    const rightCx = w - barW / 2;
    const cy = h / 2;
    ctx.fillText(dirGlyph, leftCx,  cy);
    ctx.fillText(dirGlyph, rightCx, cy);
    ctx.restore();

    // --- Centered text stack ---
    const yDirection = Math.round(h * 0.82);
    const yStatus    = Math.round(h * 0.52);
    const yPostura   = Math.round(h * 0.18);

    // Direction (bottom)
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${PX(18)}px ui-sans-serif, -apple-system, Segoe UI, Roboto, Inter, Helvetica, Arial`;
    const dirLabel = directionTxt || "Center";
    ctx.fillText(dirLabel, w / 2, yDirection);

    // Status (center)
    const statusLabel = rawState === "UPRIGHT" ? "Upright"
                        : rawState === "SLOUCHED" ? "Slouching"
                        : "Camera off";
    ctx.fillStyle = text;
    ctx.font = `800 ${PX(24)}px ui-sans-serif, -apple-system, Segoe UI, Roboto, Inter, Helvetica, Arial`;
    ctx.fillText(statusLabel, w / 2, yStatus);

    // Postura (top)
    ctx.fillStyle = title;
    ctx.font = `800 ${PX(20)}px ui-sans-serif, -apple-system, Segoe UI, Roboto, Inter, Helvetica, Arial`;
    ctx.fillText("Posturally", w / 2, yPostura);
  }

  // --- Redraw immediately when the status texts change (first-sync fix)
  let mo = null;
  try {
    mo = new MutationObserver(() => { if (running) draw(); });
    postureEl && mo.observe(postureEl,   { childList: true, subtree: true, characterData: true });
    directionEl && mo.observe(directionEl, { childList: true, subtree: true, characterData: true });
  } catch {}

  // rAF loop with background throttling fallback
  function loop(ts) {
    if (!running) return;

    if (document.hidden) {
      // When hidden, rAF can be heavily throttled—force periodic paints
      draw();
      setTimeout(() => { if (running) rafId = requestAnimationFrame(loop); }, 300);
      return;
    }

    if (!lastFrameTime) lastFrameTime = ts;
    const delta = ts - lastFrameTime;
    if (delta >= frameInterval - 1) {
      draw();
      lastFrameTime = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  async function waitForFirstFrame(video) {
    // Prefer requestVideoFrameCallback, otherwise wait until readyState >= 2
    if ("requestVideoFrameCallback" in video) {
      await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
      return;
    }
    let tries = 0;
    while (video.readyState < 2 && tries++ < 10) {
      await new Promise((r) => setTimeout(r, 30));
    }
    // Plus two RAFs to ensure the canvas stream ticks
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  async function start() {
    if (running) return;
    running = true;

    draw(); // make sure first paint reflects current DOM

    // Capture the canvas into the hidden carrier <video>
    const stream = canvas.captureStream(fps);
    pipVideoEl.srcObject = stream;

    // Wait for playback (under the click gesture)
    await pipVideoEl.play();

    // Wait for first rendered frame so PiP has content
    await waitForFirstFrame(pipVideoEl);

    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    const s = pipVideoEl.srcObject;
    if (s) s.getTracks().forEach((t) => t.stop());
    pipVideoEl.srcObject = null;
    try { mo?.disconnect(); } catch {}
  }

  // ---- Button → PiP
  buttonEl?.addEventListener("click", async () => {
    try {
      if (!document.pictureInPictureEnabled) return;

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        stop();
        return;
      }

      await start(); // ensure playback + first frame before requesting PiP

      try {
        await pipVideoEl.requestPictureInPicture();
        // Paint again exactly when PiP becomes visible (first-sync)
        draw();
      } catch (e) {
        // Chrome 139 sometimes throws InvalidStateError on the very first attempt.
        // Retry once after two RAFs if that happens.
        if (e && e.name === "InvalidStateError") {
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await pipVideoEl.requestPictureInPicture();
          draw();
        } else {
          throw e;
        }
      }
    } catch (err) {
      console.warn("PiP failed:", err);
    }
  });

  // Cleanup when user closes PiP via browser UI
  pipVideoEl?.addEventListener("leavepictureinpicture", () => {
    stop();
  });

  return { start, stop, draw, canvas };
}
