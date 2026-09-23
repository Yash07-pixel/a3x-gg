import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ASSIGNMENT_WORKSPACE_ID = "yash-assignment";

const db = supabase as unknown as SupabaseClient;

export interface AssignmentLead {
  id: string;
  name: string;
  phone: string;
  source: string;
  preferred_area: string | null;
  budget: number | null;
  move_in_date: string | null;
  stage: string;
  owner_name: string | null;
  call_outcome: string | null;
  next_action: string | null;
  next_action_due: string | null;
  tour_property: string | null;
  tour_scheduled_at: string | null;
  tour_status: string;
  closing_status: string;
  monthly_rent: number | null;
  payment_status: string;
  script_variant: string | null;
  last_activity_at: string;
  updated_at: string;
}

export interface AssignmentActivity {
  id: string;
  lead_id: string;
  actor_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

export interface LeakageSignal {
  id: string;
  name: string;
  leakage_reason: string;
  risk_score: number;
  next_action_due: string | null;
}

export interface ScriptPerformance {
  name: string;
  variant: string;
  channel: string;
  leads_used: number;
  tours_generated: number;
  bookings_generated: number;
  booking_conversion_percent: number;
}

export interface AssignmentSnapshot {
  leads: AssignmentLead[];
  activities: AssignmentActivity[];
  leakage: LeakageSignal[];
  performance: ScriptPerformance[];
}

function valueOrThrow<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Supabase returned no data.");
  return result.data;
}

export async function getAssignmentSnapshot(): Promise<AssignmentSnapshot> {
  const [leadsResult, activitiesResult, leakageResult, performanceResult] = await Promise.all([
    db
      .from("crm_leads")
      .select("*")
      .eq("workspace_id", ASSIGNMENT_WORKSPACE_ID)
      .order("updated_at", { ascending: false }),
    db
      .from("crm_activities")
      .select("id,lead_id,actor_name,action_type,description,created_at")
      .eq("workspace_id", ASSIGNMENT_WORKSPACE_ID)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("crm_lead_leakage")
      .select("id,name,leakage_reason,risk_score,next_action_due")
      .order("risk_score", { ascending: false }),
    db
      .from("crm_script_performance")
      .select(
        "name,variant,channel,leads_used,tours_generated,bookings_generated,booking_conversion_percent",
      )
      .order("variant"),
  ]);

  return {
    leads: valueOrThrow(leadsResult) as AssignmentLead[],
    activities: valueOrThrow(activitiesResult) as AssignmentActivity[],
    leakage: valueOrThrow(leakageResult) as LeakageSignal[],
    performance: valueOrThrow(performanceResult) as ScriptPerformance[],
  };
}

async function updateLead(leadId: string, patch: Record<string, unknown>) {
  const result = await db
    .from("crm_leads")
    .update({ ...patch, last_activity_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("workspace_id", ASSIGNMENT_WORKSPACE_ID)
    .select("id")
    .single();
  valueOrThrow(result);
}

async function addActivity(
  leadId: string,
  actionType: string,
  description: string,
  metadata: Record<string, unknown> = {},
) {
  const result = await db.from("crm_activities").insert({
    workspace_id: ASSIGNMENT_WORKSPACE_ID,
    lead_id: leadId,
    actor_name: "Yash Sharma",
    action_type: actionType,
    description,
    metadata,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function recordAssignmentCall(input: {
  leadId: string;
  outcome: string;
  nextAction: string;
  dueAt: string;
  scriptVariant: string;
}) {
  await updateLead(input.leadId, {
    stage: "contacted",
    owner_name: "Yash Sharma",
    call_outcome: input.outcome,
    next_action: input.nextAction,
    next_action_due: input.dueAt,
    script_variant: input.scriptVariant,
  });
  await addActivity(
    input.leadId,
    "call_completed",
    `Call saved · ${input.outcome} · next: ${input.nextAction}`,
    { script_variant: input.scriptVariant, due_at: input.dueAt },
  );
}

export async function rescueAssignmentLead(leadId: string) {
  const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  await updateLead(leadId, {
    owner_name: "Yash Sharma",
    next_action: "Call now and confirm tour slot",
    next_action_due: dueAt,
  });
  await addActivity(
    leadId,
    "leakage_rescued",
    "Lead assigned and follow-up scheduled within two hours",
    { due_at: dueAt },
  );
}

export async function scheduleAssignmentTour(input: {
  leadId: string;
  propertyName: string;
  scheduledAt: string;
}) {
  await updateLead(input.leadId, {
    stage: "tour-scheduled",
    tour_property: input.propertyName,
    tour_scheduled_at: input.scheduledAt,
    tour_status: "scheduled",
    next_action: "Complete tour and capture decision",
    next_action_due: new Date(
      new Date(input.scheduledAt).getTime() + 2 * 60 * 60 * 1000,
    ).toISOString(),
  });
  await addActivity(input.leadId, "tour_scheduled", `Tour scheduled at ${input.propertyName}`, {
    scheduled_at: input.scheduledAt,
  });
}

export async function closeAssignmentBooking(input: { leadId: string; monthlyRent: number }) {
  await updateLead(input.leadId, {
    stage: "booked",
    tour_status: "completed",
    closing_status: "closed",
    monthly_rent: input.monthlyRent,
    payment_status: "paid",
    next_action: "Prepare check-in and key handover",
    next_action_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  await addActivity(
    input.leadId,
    "booking_closed",
    `Paid booking closed at ₹${input.monthlyRent.toLocaleString("en-IN")}/month`,
    {
      monthly_rent: input.monthlyRent,
      payment_status: "paid",
    },
  );
}

export function buildTourConfirmation(
  lead: AssignmentLead,
  propertyName: string,
  scheduledAt: string,
) {
  const when = new Date(scheduledAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Hi ${lead.name}, your Gharpayy visit to ${propertyName} is confirmed for ${when}. Reply RESCHEDULE if you need another slot.`;
}
