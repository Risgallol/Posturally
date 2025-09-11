// sensitivity.js — maps 0..100 slider ➜ threshold (THRESH_MIN..THRESH_MAX)
// Updates hidden #ratio and a live tooltip #sensTip to match the slider.

const THRESH_MIN = 1.05; // most sensitive
const THRESH_MAX = 1.50; // least sensitive

const sensEl     = document.getElementById("sensitivity");
const hiddenRatio= document.getElementById("ratio");
const tipEl      = document.getElementById("sensTip");

function sliderToThreshold(v) {
  return THRESH_MAX - (v / 100) * (THRESH_MAX - THRESH_MIN);
}

// Position tooltip as a percentage inside .slider-wrap
function updateTooltipPosition() {
  const min = Number(sensEl.min) || 0;
  const max = Number(sensEl.max) || 100;
  const val = Number(sensEl.value);
  const pct = (val - min) / (max - min); // 0..1

  tipEl.style.left = `${pct * 100}%`;
  tipEl.style.transform = `translateX(-50%)`;
  tipEl.textContent = `${Math.round(val)}%`;
}

function updateThreshold() {
  const precise = sliderToThreshold(Number(sensEl.value));
  hiddenRatio.value = precise.toFixed(4);
  hiddenRatio.dispatchEvent(new Event("change", { bubbles: true }));
  tipEl.style.opacity = "1";
  updateTooltipPosition();
}

function showTip() { tipEl.style.opacity = "1"; updateTooltipPosition(); }
function hideTip() { tipEl.style.opacity = "0"; }

// ---- Init + listeners ----
updateThreshold();
sensEl.addEventListener("input",  updateThreshold);
sensEl.addEventListener("change", updateThreshold);

// Mouse
sensEl.addEventListener("mouseenter", showTip);
sensEl.addEventListener("mouseleave", hideTip);
sensEl.addEventListener("mousedown", showTip);
window.addEventListener("mouseup", hideTip);

// Touch
sensEl.addEventListener("touchstart", showTip,  { passive: true });
sensEl.addEventListener("touchend",   hideTip,  { passive: true });
sensEl.addEventListener("touchcancel",hideTip,  { passive: true });

// Keep aligned on resize
window.addEventListener("resize", updateTooltipPosition);
