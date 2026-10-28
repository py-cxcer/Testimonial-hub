"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";

/** Copies an absolute URL built from a site-relative path. */
export default function CopyLinkButton({
  path,
  label = "Copy public link",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const copy = async () => {
    const ok = await copyText(`${window.location.origin}${path}`);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={buttonClass({ variant: "secondary", size: "sm", className })}
    >
      {state === "copied" ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Copied
        </>
      ) : state === "error" ? (
        "Copy failed"
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}
