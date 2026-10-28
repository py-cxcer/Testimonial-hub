import { redirect } from "next/navigation";

// Legacy URL: embeds are configured per space (Space -> Embed).
export default function LegacyEmbedsPage() {
  redirect("/spaces");
}
