/*
 * Testimonial Hub embed loader.
 * Usage:
 *   <div data-testimonial-hub="SPACE_ID"></div>
 *   <script async src="https://YOUR_APP/embed.js"></script>
 *
 * It injects a sandboxed iframe pointing at this script's own origin and
 * resizes it to fit the testimonials. No host-page HTML or script is evaluated.
 */
(function () {
  "use strict";

  var script = document.currentScript || document.querySelector('script[src*="embed.js"]');
  if (!script || !script.src) return;

  var origin;
  try {
    origin = new URL(script.src).origin;
  } catch {
    return;
  }

  var ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function mount(el) {
    if (el.getAttribute("data-th-mounted")) return;
    var id = el.getAttribute("data-testimonial-hub");
    if (!id || !ID_RE.test(id)) return;
    el.setAttribute("data-th-mounted", "1");

    var frame = document.createElement("iframe");
    frame.src = origin + "/embed/" + id;
    frame.title = "Customer testimonials";
    frame.loading = "lazy";
    frame.height = "400";
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText = "width:100%;border:0;display:block;min-height:160px;";
    el.appendChild(frame);
  }

  function init() {
    var nodes = document.querySelectorAll("[data-testimonial-hub]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    var data = event.data;
    if (!data || data.type !== "testimonial-hub:resize" || typeof data.height !== "number") return;
    var frames = document.querySelectorAll("[data-testimonial-hub] iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) {
        frames[i].style.height = Math.min(Math.max(Math.ceil(data.height), 120), 5000) + "px";
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
