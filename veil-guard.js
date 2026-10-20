(function () {
  if (typeof window === "undefined") return;
  if (window.__veilGuard) return;
  window.__veilGuard = 1;
  var dead = false;
  function kill() {
    if (dead) return;
    dead = true;
    try {
      document.documentElement.innerHTML = "<head><title>Veil</title></head><body style=\"margin:0;background:#000\"></body>";
    } catch (e) {}
  }
  window.__veilKill = kill;
  var baseW = null, baseH = null, baseDpr = 0;
  setInterval(function () {
    var ow = window.outerWidth || 0;
    var oh = window.outerHeight || 0;
    var iw = window.innerWidth || 0;
    var ih = window.innerHeight || 0;
    if (ow < 80 || oh < 80 || iw < 40 || ih < 40) return;
    var dw = Math.max(0, ow - iw);
    var dh = Math.max(0, oh - ih);
    var dpr = window.devicePixelRatio || 1;
    if (baseW == null || Math.abs(dpr - baseDpr) > 0.02) {
      baseW = dw;
      baseH = dh;
      baseDpr = dpr;
      return;
    }
    if (dw + 12 < baseW) baseW = dw;
    if (dh + 12 < baseH) baseH = dh;
    var growW = dw - baseW;
    var growH = dh - baseH;
    var halfW = (iw / ow) < 0.68 && (iw / ow) > 0.22 && growW > 180;
    var halfH = (ih / oh) < 0.68 && (ih / oh) > 0.22 && growH > 180;
    if (halfW || halfH) kill();
  }, 700);
})();
