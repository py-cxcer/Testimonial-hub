"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * DEMO billing. No payment gateway is involved and nothing is charged.
 * Both actions call the set_demo_plan() database function, which derives the
 * target account from the caller's session (auth.uid()) - a client can never
 * name another user - and is idempotent.
 */
async function setDemoPlan(plan: "pro" | "free"): Promise<"ok" | "error"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("set_demo_plan", { p_plan: plan });
  if (error) {
    console.error("set_demo_plan failed:", error.code, error.message);
    return "error";
  }

  revalidatePath("/", "layout");
  return "ok";
}

export async function confirmDemoUpgradeAction(): Promise<void> {
  const result = await setDemoPlan("pro");
  redirect(result === "ok" ? "/billing?notice=upgraded" : "/billing?notice=error");
}

export async function switchToFreePlanAction(): Promise<void> {
  const result = await setDemoPlan("free");
  redirect(result === "ok" ? "/billing?notice=downgraded" : "/billing?notice=error");
}
