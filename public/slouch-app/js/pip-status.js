
// pip-status.js — standalone status-only PiP (no edits to your main script.js)

// Grab only what's needed; these exist already in your DOM:
const postureMsgEl   = document.getElementById("postureMsg");
const directionMsgEl = document.getElementById("directionMsg");
const statusBtn      = document.getElementById("statusPip");
const pipVideo       = document.getElementById("pipVideo");

let pipCanvas = null;
let pipCtx = null;
let pipStream = null;
let pipAnimating = false;
let pipLastDraw = 0;

function drawPiPStatusFrame() {
  if (!pipCanvas || !pipCtx) return;
  const W = pipCanvas.width, H = pipCanvas.height;

  // Background
  pipCtx.fillStyle = "#0b1320";
  pipCtx.fillRect(0, 0, W, H);

  // Header
  pipCtx.fillStyle = "#9fb0d1";
  pipCtx.font = "16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  pipCtx.fillText("Slouch Detector", 16, 28);

  // Lines mirrored from your status panel (keeps it decoupled)
  pipCtx.fillStyle = "#e6eefc";
  pipCtx.font = "18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  pipCtx.fillText((postureMsgEl?.textContent || "Posture: —"), 16, 64);
  pipCtx.fillText((directionMsgEl?.textContent || "Direction: —"), 16, 96);

  // Subtle hint
  pipCtx.fillStyle = "#9fb0d1";
  pipCtx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  pipCtx.fillText("Click window to return to Slouch Detector", 16, H - 14);
}

function startPiPDrawLoop() {
  if (pipAnimating) return;
  pipAnimating = true;
  const targetDelta = 1000 / 10; // ~10 fps

  function step(ts) {
    if (!pipAnimating) return;
    if (ts - pipLastDraw >= targetDelta) {
      drawPiPStatusFrame();
      pipLastDraw = ts;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function stopPiPDrawLoop() {
  pipAnimating = false;
}

async function enterStatusPiP() {
  // Lazy init canvas & stream
  if (!pipCanvas) {
    pipCanvas = document.createElement("canvas");
    pipCanvas.width = 480;  // compact and readable
    pipCanvas.height = 200;
    pipCtx = pipCanvas.getContext("2d");
  }
  if (!pipStream) {
    pipStream = pipCanvas.captureStream(15); // 15 fps is plenty
    pipVideo.srcObject = pipStream;
    await pipVideo.play().catch(()=>{});
  }
  drawPiPStatusFrame();
  startPiPDrawLoop();
  await pipVideo.requestPictureInPicture();
}

async function exitStatusPiP() {
  stopPiPDrawLoop();
  if (document.pictureInPictureElement) {
    try { await document.exitPictureInPicture(); } catch {}
  }
}

// Toggle handler (completely independent of your existing PiP)
statusBtn?.addEventListener("click", async () => {
  try {
    if (document.pictureInPictureElement) {
      await exitStatusPiP();
    } else {
      await enterStatusPiP();
    }
  } catch (err) {
    console.warn("Status PiP failed:", err);
    // You can surface a toast here if you want
  }
});

// If user closes PiP via the mini-window “X”
document.addEventListener("leavepictureinpicture", () => {
  stopPiPDrawLoop();
});
