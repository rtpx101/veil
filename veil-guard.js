(function () {
  if (typeof window === "undefined") return;
  if (window.__veilGuard) return;
  window.__veilGuard = 1;
  var dead = false;
  function kill() {
    if (dead) return;
    dead = true;
    try { window.stop(); } catch (e) {}
    try {
      document.documentElement.innerHTML = "<head><title>Veil</title></head><body style=\"margin:0;background:#000\"></body>";
    } catch (e) {}
  }
  window.__veilKill = kill;
  function devtoolsGap() {
    var dw = Math.abs((window.outerWidth || 0) - (window.innerWidth || 0));
    var dh = Math.abs((window.outerHeight || 0) - (window.innerHeight || 0));
    return dw > 240 || dh > 320;
  }
  setInterval(function () {
    if (devtoolsGap()) kill();
    try {
      var mark = new Image();
      Object.defineProperty(mark, "id", { get: function () { kill(); } });
      console.log(mark);
    } catch (e) {}
  }, 1400);
  setInterval(function () {
    var t = performance.now();
    debugger;
    if (performance.now() - t > 140) kill();
  }, 1800);
})();
