"use client";

import { useEffect } from "react";

/**
 * Tells the host page (via the embed.js loader) how tall the widget is so the
 * iframe can fit its content. Only a number is posted, so "*" as the target
 * origin leaks nothing.
 */
export default function EmbedAutoResize({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || window.parent === window) return;

    const post = () => {
      window.parent.postMessage(
        { type: "testimonial-hub:resize", height: el.getBoundingClientRect().height },
        "*"
      );
    };

    post();
    const observer = new ResizeObserver(post);
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetId]);

  return null;
}
