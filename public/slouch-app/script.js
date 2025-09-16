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

  // Sidebar / status elements
  statusMsg: document.getElementById("statusMsg"),
  postureMsg: document.getElementById("postureMsg"),       // value ONLY ("Upright" | "Slouching")
  directionMsg: document.getElementById("directionMsg"),   // value ONLY ("Left" | "Center" | "Right")
  postureScore: document.getElementById("postureScore"),   // % when upright, "% • sec" when slouching

  // Controls
  ratio: document.getElementById("ratio"),
  hold: document.getElementById("hold"),
  yawHold: document.getElementById("yawHold"),
  beep: document.getElementById("beep"),

  calibrate: document.getElementById("calibrate"),
};

// On first load:
setCameraOffUI();
setStatus("Camera is off — click Start Camera to begin.");


// Initialize the PiP overlay module
const pipOverlay = createPipOverlay({
  postureEl:   els.postureMsg,
  directionEl: els.directionMsg,
  hintEl:      els.statusMsg,
  pipVideoEl:  document.getElementById("pipVideo"),
  buttonEl:    els.pip,
  width: 240,
  height: 135,
  fps: 12
});
window.pipOverlay = pipOverlay;

/* --------- Canvas / Audio --------- */
const ctx = els.overlay.getContext("2d");
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/* --------- Config --------- */
const CALIB_FRAMES   = 10;
const COOLDOWN_MS    = 10_000;
const YAW_THRESHOLD  = 0.12;
const YAW_SMOOTH     = 0.7;
const YAW_FLIP       = true;

// Sensitivity bounds (match slider mapping)
const THRESH_MIN = 1.05;
const THRESH_MAX = 1.50;

// Performance
const DETECT_FPS = 12;
const DETECT_INTERVAL = 1000 / DETECT_FPS;


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

let slouchStart = null;
let slouchEpisodeAlerted = false;
let lastAlert = 0;

let yawEMA = null;
let yawHoldDir = "CENTER";
let yawHoldStart = null;

let lastDetectTs = 0;


/* --------- Wake Lock --------- */
let wakeLock = null;
async function requestWakeLock() { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
async function releaseWakeLock() { try { await wakeLock?.release(); } catch {} wakeLock = null; }

/* --------- Helpers --------- */
function setCameraOffUI() {
  if (els.postureMsg)   els.postureMsg.textContent   = "—";
  if (els.directionMsg) els.directionMsg.textContent = "—";
  if (els.postureScore) els.postureScore.textContent = "—";
}

function setStatus(msg) { if (els.statusMsg) els.statusMsg.innerHTML = msg; }

function runningHint() {
  return "<b>Running</b><br>Click <b>Keep active</b> to open the mini window.<br>Keep this <b>Posturally</b> tab open for background monitoring.";
}

// 100% at THRESH_MIN, 0% at THRESH_MAX
function indexToScoreAligned(indexVal) {
  if (!Number.isFinite(indexVal)) return null;
  const range = THRESH_MAX - THRESH_MIN;
  const pct = 100 * (THRESH_MAX - indexVal) / range;
  return Math.max(0, Math.min(100, Math.round(pct)));
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

function computeYaw(lms) {
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
        width:     { ideal: 640 },
        height:    { ideal: 480 },
        frameRate: { ideal: 15, max: 15 }
      },
      audio: false
    });

    els.cam.srcObject = stream;
    await els.cam.play();

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

    // Clear sidebar values
    setCameraOffUI();

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

  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (ctx) ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
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

// --- Keep Active button UI state
const keepActiveBtn = els.pip;
const pipCarrierVideo = document.getElementById("pipVideo");
if (keepActiveBtn && pipCarrierVideo) {
  pipCarrierVideo.addEventListener("enterpictureinpicture", () => {
    keepActiveBtn.classList.add("is-active");
    keepActiveBtn.textContent = "Deactivate";
  });
  document.addEventListener("leavepictureinpicture", () => {
    keepActiveBtn.classList.remove("is-active");
    keepActiveBtn.textContent = "Keep active";
  });
  keepActiveBtn.addEventListener("click", async () => {
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
    }
  });
}


// Calibration helper
function startCalibration() {
  if (!isCameraOn) return;
  calibrating = true;
  calibSamples = [];
  calibCount = 0;
  baselineMetric = null;
  slouchStart = null;
  slouchEpisodeAlerted = false;
  setStatus("Calibration started — sit upright and hold for ~1s…");
  if (els.postureMsg)   els.postureMsg.textContent   = "—";
  if (els.postureScore) els.postureScore.textContent = "—";
}

/* --------- Main loop --------- */
async function loop() {
  if (!isCameraOn) return;
  const now = performance.now();

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
          setStatus(runningHint());
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

      // Slider threshold
      const threshold = parseFloat(els.ratio?.value || "1.20");

      // 0..100 score aligned to sensitivity range
      const score = indexToScoreAligned(slouchIndex);
      const scoreTxt = (score == null) ? "—" : `${score}%`;

      // Slouch timer config
      const holdMs = Math.max(0, parseFloat(els.hold?.value || "30") * 1000);

      // In slouch zone?
      const isSlouching = (slouchIndex != null) && (slouchIndex > threshold);

      if (isSlouching) {
        if (!slouchStart) { slouchStart = performance.now(); slouchEpisodeAlerted = false; }
        const held = performance.now() - slouchStart;

        // Posture label only; score shows "% • seconds"
        if (els.postureMsg)   els.postureMsg.textContent = "Slouching";
        if (els.postureScore) els.postureScore.textContent = `${scoreTxt} • ${(held/1000).toFixed(1)}s`;

        if (!slouchEpisodeAlerted && held >= holdMs && performance.now() - lastAlert >= COOLDOWN_MS) {
          lastAlert = performance.now();
          slouchEpisodeAlerted = true;
          if (els.beep?.checked) beep();
        }
        setStatus(runningHint());

      } else {
        slouchStart = null;
        slouchEpisodeAlerted = false;

        // Upright: label only; score is just the %
        if (els.postureMsg)   els.postureMsg.textContent = "Upright";
        if (els.postureScore) els.postureScore.textContent = scoreTxt;

        if (baselineMetric != null) setStatus(runningHint());
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

      if (els.directionMsg) els.directionMsg.textContent = label;
    }
  } else {
    if (els.directionMsg) els.directionMsg.textContent = "—";
  }

  rafId = requestAnimationFrame(loop);
}

/* --------- Events --------- */
if (els.toggle) els.toggle.addEventListener("click", toggleCamera);

if (!els.toggle) {
  els.start?.addEventListener("click", startCam);
  els.stop?.addEventListener("click", stopCam);
}

els.calibrate?.addEventListener("click", startCalibration);

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "c" && isCameraOn) startCalibration();
  if (e.code === "Space" && !e.repeat) { e.preventDefault(); toggleCamera(); }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    setStatus("Background tab — use PiP to keep detection active");
  } else {
    if (!isCameraOn) setStatus("Camera is off — click Start Camera to begin.");
    else setStatus(baselineMetric ? runningHint() :
      "Sit upright with your face and shoulders on screen. Press C to calibrate your good posture");
  }
});

window.addEventListener("beforeunload", () => {
  if (stream) stream.getTracks().forEach(t => t.stop());
  releaseWakeLock();
});

/* --------- Geometry helpers --------- */
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

/* ---------- Contact modal ---------- */
const contactBtn    = document.getElementById("contactButton");
const contactModal  = document.getElementById("contactModal");
const contactCancel = document.getElementById("contactCancel");
const contactForm   = document.getElementById("contactForm");

contactBtn?.addEventListener("click", () => contactModal?.classList.add("is-open"));
contactCancel?.addEventListener("click", () => contactModal?.classList.remove("is-open"));

contactModal?.addEventListener("click", (e) => {
  if (e.target === contactModal) contactModal.classList.remove("is-open");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") contactModal?.classList.remove("is-open");
});
contactForm?.addEventListener("submit", () => {
  contactModal?.classList.remove("is-open");
  try { setStatus("Thanks! Your message was sent. We’ll reply soon."); } catch {}
});



