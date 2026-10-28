"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/button";

export default function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={buttonClass({ className: "w-full sm:w-auto" })}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
