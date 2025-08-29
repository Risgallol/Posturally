/* Client-only posture + yaw demo — all on-device (no uploads). */
import {
  PoseLandmarker,
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

import { createPipOverlay } from "./pip-overlay.js?v=2025-08-26a";


/* --------- DOM --------- */
const els = {
  // Primary controls
  toggle: document.getElementById("cameraToggle"),
  start: document.getElementById("start"),
  stop: document.getElementById("stop"),

  // PiP button supports both ids
  pip: document.getElementById("statusPip") || document.getElementById("pip"),

  // Media & overlay
  cam: document.getElementById("cam"),
  overlay: document.getElementById("overlay"),

  // Status panel elements
  statusMsg: document.getElementById("statusMsg"),
  postureMsg: document.getElementById("postureMsg"),
  directionMsg: document.getElementById("directionMsg"),

  // Controls
  ratio: document.getElementById("ratio"),
  hold: document.getElementById("hold"),
  yawHold: document.getElementById("yawHold"),
  beep: document.getElementById("beep"),

  calibrate: document.getElementById("calibrate"),
};
// On first load, be explicit:
setCameraOffUI();
setStatus("Camera is off — click Start Camera to begin.");


// Initialize the PiP overlay module
const pipOverlay = createPipOverlay({
  postureEl:   els.postureMsg,
  directionEl: els.directionMsg,
  hintEl:      els.statusMsg,
  pipVideoEl:  document.getElementById("pipVideo"),
  buttonEl:    els.pip,     // clicking this toggles PiP
  width: 240,
  height: 135,
  fps: 12
});

// (Optional) expose for debugging in console
window.pipOverlay = pipOverlay;

/* --------- Canvas / Audio --------- */
const ctx = els.overlay.getContext("2d");
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/* --------- Config --------- */
const CALIB_FRAMES   = 30;        // ~1s @30fps
const COOLDOWN_MS    = 10_000;    // shared cooldown
const YAW_THRESHOLD  = 0.12;      // 0.10–0.18 typical
const YAW_SMOOTH     = 0.7;       // EMA smoothing
const YAW_FLIP       = true;      // flip sign if LEFT/RIGHT feels inverted

// Use the same values as your sensitivity slider mapping
const THRESH_MIN = 1.05; // most sensitive
const THRESH_MAX = 1.50; // least sensitive

// --- Performance knobs ---
const DETECT_FPS = 12;                     // run ML ~12x/sec
const DETECT_INTERVAL = 1000 / DETECT_FPS; // ms between detections


/* --------- State --------- */
let stream = null;
let rafId = null;
let pose = null;
let face = null;

let isCameraOn = false;

let baselineMetric = null;
let calibSamples = [];
let calibCount = 0;
let calibrating = false;

let slouchStart = null;            // ms when index first exceeded threshold
let slouchEpisodeAlerted = false;  // one beep per episode
let lastAlert = 0;                 // ms last alert (shared)

let yawEMA = null;                 // smoothed yaw value
let yawHoldDir = "CENTER";
let yawHoldStart = null;           // ms when yaw exceeded threshold

let lastDetectTs = 0; // ms timestamp of last ML pass


/* --------- Wake Lock --------- */
let wakeLock = null;
async function requestWakeLock() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
async function releaseWakeLock() { try { await wakeLock?.release(); } catch {} wakeLock = null; }

/* --------- Helpers --------- */
function drawCircle(x, y, r = 6, color = "rgba(255,255,255,0.9)") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function setCameraOffUI() {
  // Neutral text so pip-overlay parses state as UNKNOWN => "Camera off" + amber bars
  if (els.postureMsg)   els.postureMsg.textContent   = "Posture: —";
  if (els.directionMsg) els.directionMsg.textContent = "Direction: —";
  setStatus("Camera is off — click Start Camera to begin.");
}

// Score aligned to the slider's range: THRESH_MIN -> 100, THRESH_MAX -> 0
function indexToScoreAligned(indexVal) {
  if (!Number.isFinite(indexVal)) return null;
  const range = THRESH_MAX - THRESH_MIN;
  const pct = 100 * (THRESH_MAX - indexVal) / range;
  return Math.max(0, Math.min(100, Math.round(pct)));
}



function drawLine(ax, ay, bx, by, width = 1, color = "rgba(200,200,200,0.9)") {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}
function px(pt) { return { x: pt.x * els.overlay.width, y: pt.y * els.overlay.height }; }
function beep() {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g).connect(audioCtx.destination);
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
  o.start(); o.stop(audioCtx.currentTime + 0.26);
}
function setStatus(msg) { if (els.statusMsg) els.statusMsg.innerHTML = msg; }

// Centralized copy for the running state
function runningHint() {
  return "<b>Running</b><br>Click <b>Keep active</b> to open the mini window.<br>Keep this <b>Postura</b> tab open for background monitoring.";
}

// Convert slouch index (~1 good, ↑ worse) to a 0–100 score based on current threshold.
// 100% ≈ upright (index~1), 0% ≈ at threshold.
function indexToScore(indexVal, thresholdVal) {
  if (!Number.isFinite(indexVal) || !Number.isFinite(thresholdVal) || thresholdVal <= 1) return null;
  const pct = 100 * (1 - (indexVal - 1) / (thresholdVal - 1));
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function computeYaw(lms) {
  // Face Landmarker indices: 33 (left eye outer), 263 (right eye outer), 1 (nose tip).
  const li = 33, ri = 263, noseIdx = 1;
  if (!lms || lms.length <= Math.max(li, ri, noseIdx)) return null;
  const left = lms[li], right = lms[ri], nose = lms[noseIdx];
  if (!left || !right || !nose) return null;
  const eyeSpan = Math.abs(right.x - left.x);
  if (eyeSpan < 1e-6) return null;
  const eyeMid = 0.5 * (left.x + right.x);
  return (nose.x - eyeMid) / eyeSpan; // negative=LEFT, positive=RIGHT
}

/* --------- Models --------- */
async function initModels() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  pose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });

  face = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}

/* --------- UI state for the toggle --------- */
function setToggleUI(on) {
  isCameraOn = on;
  if (els.toggle) {
    els.toggle.textContent = on ? "Stop Camera" : "Start Camera";
    els.toggle.classList.toggle("is-on", on);
    els.toggle.setAttribute("aria-pressed", String(on));
  }
  // Keep legacy buttons in sync if they exist
  if (els.start) els.start.disabled = on;
  if (els.stop)  els.stop.disabled  = !on;
}

/* --------- Camera control --------- */
async function startCam() {
  if (isCameraOn) return;
  try {
    setStatus("Loading model…");
    if (!pose || !face) await initModels();

    setStatus("Requesting camera…");
    stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width:     { ideal: 640 },   // 480p–720p is plenty for pose
    height:    { ideal: 480 },
    frameRate: { ideal: 15, max: 15 } // cut decode + ML cost
  },
  audio: false
});

    els.cam.srcObject = stream;
    await els.cam.play();

    // match canvas to element size
    els.overlay.width  = els.overlay.clientWidth  || (els.cam.videoWidth  || 640);
    els.overlay.height = els.overlay.clientHeight || (els.cam.videoHeight || 480);

    // reset state
    baselineMetric = null;
    calibrating = false;
    calibSamples = [];
    calibCount = 0;

    slouchStart = null;
    slouchEpisodeAlerted = false;

    yawEMA = null;
    yawHoldDir = "CENTER";
    yawHoldStart = null;

    if (els.postureMsg)  els.postureMsg.textContent  = "Posture: —  —  Score: —";
    if (els.directionMsg) els.directionMsg.textContent = "Direction: —";
    setStatus("Sit upright and press C to calibrate your good posture");

    await requestWakeLock();
    setToggleUI(true);
    loop();

    if ("serviceWorker" in navigator) {
      try { navigator.serviceWorker.register("./sw.js"); } catch {}
    }
  } catch (err) {
    console.error("Camera start failed:", err);
    setStatus("Unable to access camera. Check permissions and try again.");
    setToggleUI(false);
  }
}

function stopCam() {
  if (!isCameraOn) return;

  // stop loop
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  // stop tracks
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  // clear overlay
  if (ctx) ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
  // reset video
  els.cam.srcObject = null;

  setToggleUI(false);
  setStatus("Camera stopped — click Start Camera to begin again.");
    setCameraOffUI();
  try { window.pipOverlay?.draw?.(); } catch {}
  releaseWakeLock();
}

function toggleCamera() {
  if (isCameraOn) stopCam(); else startCam();
}

// Calibration helper
function startCalibration() {
  if (!isCameraOn) return; // only when camera is running
  calibrating = true;
  calibSamples = [];
  calibCount = 0;
  baselineMetric = null;
  slouchStart = null;
  slouchEpisodeAlerted = false;
  setStatus("Calibration started — sit upright and hold for ~1s…");
  if (els.postureMsg) els.postureMsg.textContent = "Posture: —  —  Score: —";
}

/* --------- Main loop --------- */
async function loop() {
  if (!isCameraOn) return;
  const now = performance.now();

  // Throttle ML work
  if (now - lastDetectTs < DETECT_INTERVAL) {
    rafId = requestAnimationFrame(loop);
    return;
  }
  lastDetectTs = now;

  let poseRes, faceRes;
  try {
    poseRes = await pose.detectForVideo(els.cam, now);
    faceRes = await face.detectForVideo(els.cam, now);
  } catch (e) {
    console.warn("detectForVideo error:", e);
    rafId = requestAnimationFrame(loop);
    return;
  }

  ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);

  // --- Pose / Score (slouch) ---
  let slouchIndex = null;
  if (poseRes?.landmarks?.length) {
    const lm = poseRes.landmarks[0];
    const nose = px(lm[0]);
    const lSh  = px(lm[11]);
    const rSh  = px(lm[12]);

    const { metric } = noseToShoulderDistanceNorm(nose, lSh, rSh);

    

    if (calibrating) {
      const valid = Number.isFinite(metric) && metric > 0;
      if (valid) {
        calibSamples.push(metric);
        calibCount++;
        setStatus(`Calibrating… ${calibCount}/${CALIB_FRAMES}`);
        if (calibCount >= CALIB_FRAMES) {
          baselineMetric = calibSamples.reduce((a,b)=>a+b,0)/calibSamples.length;
          calibrating = false;
          calibSamples = [];
          calibCount = 0;
          setStatus("<b>Running</b><br>Click <b>Keep active</b> to open the mini window.<br>Keep this <b>Postura</b> tab open for background monitoring.");
;
        }
      } else {
        setStatus("Calibrating… (make sure both shoulders and face are visible)");
      }
    } else if (baselineMetric == null) {
      setStatus("Sit upright with your head and shoulders in frame, then press C to calibrate your good posture");
    } else {
      if (Number.isFinite(metric) && metric > 0) {
        slouchIndex = baselineMetric / Math.max(metric, 1e-6); // smaller distance => higher index
      }

      // Read the *threshold* your slider set (via hidden #ratio)
      const threshold = parseFloat(els.ratio?.value || "1.20");

      // Absolute score 0..100
      const score = indexToScoreAligned(slouchIndex);
      const scoreTxt = (score == null) ? "—" : `${score}%`;
      
      // Timer settings
      const holdMs = Math.max(0, parseFloat(els.hold?.value || "30") * 1000);

      // Slouch zone is defined by threshold (sensitivity)
      // (index>threshold) <=> (scoreAbs < indexToScoreAbs(threshold))
      const belowSensitivity = (slouchIndex != null) && (slouchIndex > threshold);

      if (belowSensitivity) {
        if (!slouchStart) { slouchStart = performance.now(); slouchEpisodeAlerted = false; }
        const held = performance.now() - slouchStart;

        els.postureMsg && (els.postureMsg.textContent =
          `Posture: Slouching — Score: ${scoreTxt} — Time: ${(held/1000).toFixed(1)}s`);

        if (!slouchEpisodeAlerted && held >= holdMs && performance.now() - lastAlert >= COOLDOWN_MS) {
          lastAlert = performance.now();
          slouchEpisodeAlerted = true;
          if (els.beep?.checked) beep();
        }
        setStatus("<b>Running</b><br>Click <b>Keep active</b> to open the mini window.<br>Keep this <b>Postura</b> tab open for background monitoring.");

      } else {
        slouchStart = null;
        slouchEpisodeAlerted = false;
        els.postureMsg && (els.postureMsg.textContent = `Posture: Upright — Score: ${scoreTxt}`);
        if (baselineMetric != null) {
          setStatus("<b>Running</b><br>Click <b>Keep active</b> to open the mini window.<br>Keep this <b>Postura</b> tab open for background monitoring.");

        }
      }
    }
  } else {
    if (baselineMetric == null && !calibrating) {
      setStatus("No person detected — click Start and allow camera access");
    }
  }


  // --- Face / Direction ---
  if (faceRes?.faceLandmarks?.length) {
    const lms = faceRes.faceLandmarks[0];
    const yaw = computeYaw(lms); // negative=LEFT, positive=RIGHT
    if (yaw != null) {
      yawEMA = (yawEMA == null) ? yaw : (YAW_SMOOTH * yawEMA + (1 - YAW_SMOOTH) * yaw);
      const yawAdj = YAW_FLIP ? -yawEMA : yawEMA;

      let label = "Center";
      if (yawAdj > YAW_THRESHOLD) label = "Right";
      else if (yawAdj < -YAW_THRESHOLD) label = "Left";

      const yawHoldMs = Math.max(0, parseFloat(els.yawHold?.value || "30") * 1000);

      if (label !== "Center") {
        if (yawHoldDir !== label) { yawHoldDir = label; yawHoldStart = performance.now(); }
        const heldMs = performance.now() - (yawHoldStart || performance.now());
        if (heldMs >= yawHoldMs && performance.now() - lastAlert >= COOLDOWN_MS) {
          lastAlert = performance.now();
          if (els.beep?.checked) beep();
        }
      } else {
        yawHoldDir = "CENTER"; yawHoldStart = null;
      }

      els.directionMsg && (els.directionMsg.textContent = `Direction: ${label}`);
    }
  } else {
    els.directionMsg && (els.directionMsg.textContent = "Direction: —");
  }

  rafId = requestAnimationFrame(loop);
}

/* --------- Events --------- */

// Preferred: single toggle button
if (els.toggle) els.toggle.addEventListener("click", toggleCamera);

// Back-compat: legacy start/stop buttons
if (!els.toggle) {
  els.start?.addEventListener("click", startCam);
  els.stop?.addEventListener("click", stopCam);
}

// Calibrate button click
els.calibrate?.addEventListener("click", startCalibration);

// Keyboard: 'c' to calibrate; Space toggles camera
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "c" && isCameraOn) {
    startCalibration();
  }
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    toggleCamera();
  }
});

// Background hint
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    setStatus("Background tab — use PiP to keep detection active");
  } else {
    if (!isCameraOn) {
      setStatus("Camera is off — click Start Camera to begin.");
    } else {
      setStatus(
        baselineMetric
          ? runningHint()
          : "Sit upright with your face and shoulders on screen. Press C to calibrate your good posture"
      );
    }
  }
});


// Cleanup
window.addEventListener("beforeunload", () => {
  if (stream) stream.getTracks().forEach(t => t.stop());
  releaseWakeLock();
});

/* --------- Geometry helpers --------- */
/** Perpendicular distance from NOSE to shoulder segment, normalized by shoulder width. */
function noseToShoulderDistanceNorm(nose, lSh, rSh) {
  if (!nose || !lSh || !rSh) return { metric: null, proj: null };
  const ax = lSh.x, ay = lSh.y;
  const bx = rSh.x, by = rSh.y;
  const px_ = nose.x, py_ = nose.y;

  const vx = bx - ax, vy = by - ay;
  const wx = px_ - ax, wy = py_ - ay;
  const segLen2 = vx*vx + vy*vy;
  if (segLen2 < 1e-6) return { metric:null, proj:null };

  let t = (wx*vx + wy*vy) / segLen2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t*vx, qy = ay + t*vy;

  const dx = px_ - qx, dy = py_ - qy;
  const dist = Math.hypot(dx, dy);
  const shoulderW = Math.sqrt(segLen2);
  return { metric: dist/shoulderW, proj: {x: qx, y: qy} };
}

/* ---------- Contact modal (target by ID to avoid clashes with onboarding overlay) ---------- */
const contactBtn    = document.getElementById("contactButton");
const contactModal  = document.getElementById("contactModal");
const contactCancel = document.getElementById("contactCancel");
const contactForm   = document.getElementById("contactForm");

contactBtn?.addEventListener("click", () => contactModal?.classList.add("is-open"));
contactCancel?.addEventListener("click", () => contactModal?.classList.remove("is-open"));

// Click backdrop to close
contactModal?.addEventListener("click", (e) => {
  if (e.target === contactModal) contactModal.classList.remove("is-open");
});

// ESC to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") contactModal?.classList.remove("is-open");
});

// Close after submit + show friendly confirmation in status line
contactForm?.addEventListener("submit", () => {
  contactModal?.classList.remove("is-open");
  try { setStatus("Thanks! Your message was sent. We’ll reply soon."); } catch {}
});


/* ---------- Quick Start & Floating Help ---------- */
const quickStartBtn = document.getElementById("quickStart");
const startCamBtn   = document.getElementById("cameraToggle");
const videoWrap     = document.querySelector(".video-wrap");
const floatingHelp  = document.getElementById("floatingHelp");

// Try to open onboarding if your onboarding.js exposes it; otherwise show a hint
function openQuickTips() {
  try {
    if (window.onboarding && typeof window.onboarding.open === "function") {
      window.onboarding.open();
      return;
    }
  } catch {}
  // Fallback hint
  try { setStatus("Tip: Click <b>Start Camera</b>, then press <b>C</b> to calibrate your good posture."); } catch {}
}

// Scroll to camera and gently “pulse” the Start button
function focusCameraArea() {
  if (videoWrap) videoWrap.scrollIntoView({ behavior: "smooth", block: "center" });
  if (startCamBtn) {
    startCamBtn.classList.remove("pulse");        // restart animation if already present
    void startCamBtn.offsetWidth;                  // reflow to reset CSS animation
    startCamBtn.classList.add("pulse");
    startCamBtn.focus({ preventScroll: true });
  }
}

quickStartBtn?.addEventListener("click", () => {
  focusCameraArea();

});


if (keepActiveBtn) {
  // When PiP enters
  document.addEventListener("enterpictureinpicture", () => {
    keepActiveBtn.classList.add("is-active");
    keepActiveBtn.textContent = "Deactivate";
  });

  // When PiP exits
  document.addEventListener("leavepictureinpicture", () => {
    keepActiveBtn.classList.remove("is-active");
    keepActiveBtn.textContent = "Keep active";
  });

  // Also handle click if you want "Deactivate" to close PiP
  keepActiveBtn.addEventListener("click", async () => {
    if (document.pictureInPictureElement) {
      // Already active → deactivate
      await document.exitPictureInPicture().catch(() => {});
    }
    // else normal behavior is handled by pip-overlay.js
  });
}

