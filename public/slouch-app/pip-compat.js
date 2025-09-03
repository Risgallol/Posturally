// pip-compat.js — Safari-safe guard (no modules, no optional chaining)
(function () {
  // Feature detect Chrome/Edge/Brave/Opera custom overlay PiP
  function supportsCustomOverlayPiP() {
    try {
      var hasDocPiP = ("documentPictureInPicture" in window) &&
        window.documentPictureInPicture &&
        typeof window.documentPictureInPicture.requestWindow === "function";
      var hasRVFC = ("requestVideoFrameCallback" in HTMLVideoElement.prototype);
      return !!(hasDocPiP && hasRVFC);
    } catch (e) { return false; }
  }

  function ensureNoticeNode() {
    var box = document.getElementById("pipNotice");
    if (!box) {
      box = document.createElement("div");
      box.id = "pipNotice";
      box.setAttribute("role", "alert");
      box.setAttribute("aria-live", "polite");
      // Minimal inline fallback styles (in case CSS didn’t load)
      box.style.position = "fixed";
      box.style.right = "16px";
      box.style.bottom = "16px";
      box.style.zIndex = "100000";
      box.style.maxWidth = "380px";
      box.style.padding = "12px 14px";
      box.style.borderRadius = "12px";
      box.style.background = "#1f2937";
      box.style.color = "#fff";
      box.style.boxShadow = "0 6px 22px -8px rgba(0,0,0,.18)";
      box.style.font = "500 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
      box.style.display = "none";
      document.body.appendChild(box);
    }
    return box;
  }

  function showPiPBlockedNotice() {
    var box = ensureNoticeNode();
    box.innerHTML =
      '<strong>Keep Active isn’t available in this browser.</strong><br/>' +
      'The background mini-window works only on laptop and Chromium browsers: ' +
      '<b>Google Chrome</b>, <b>Microsoft Edge</b>, <b>Brave</b>, or <b>Opera</b>.' +
      '<small style="opacity:.8;display:block;margin-top:6px">You can still use Posturally here, but continuous background monitoring requires a different browser or device. We’re very sorry for this inconvenience. </small>';
    box.style.display = "block";
    if (box._t) clearTimeout(box._t);
    box._t = setTimeout(function () { box.style.display = "none"; }, 8000);
  }

  function installKeepActiveGuard() {
    var btn = document.getElementById("statusPip") || document.getElementById("pip");
    if (!btn) return;

    // Capture phase intercept so we beat other listeners
    btn.addEventListener("click", function (e) {
      if (supportsCustomOverlayPiP()) return; // Chromium → allow normal flow
      e.preventDefault();
      // Stop any downstream PiP handlers
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      // Reset visuals if your code toggled them
      try {
        btn.classList.remove("is-active");
        btn.textContent = "Keep active";
      } catch (e) {}
      showPiPBlockedNotice();
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installKeepActiveGuard);
  } else {
    installKeepActiveGuard();
  }
})();
