import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FlaskConical,
  LoaderCircle,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildTourConfirmation,
  closeAssignmentBooking,
  getAssignmentSnapshot,
  recordAssignmentCall,
  rescueAssignmentLead,
  scheduleAssignmentTour,
  type AssignmentLead,
  type AssignmentSnapshot,
} from "@/lib/assignment-crm";

const toLocalDateTimeInput = (date: Date) => {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localTime.toISOString().slice(0, 16);
};

const twoHoursFromNow = () => toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000));
const tomorrowAfternoon = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(15, 0, 0, 0);
  return toLocalDateTimeInput(date);
};

function useAssignmentSnapshot() {
  const [snapshot, setSnapshot] = useState<AssignmentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await getAssignmentSnapshot());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the assignment backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { snapshot, error, loading, reload };
}

function BackendHeader({ title, icon: Icon }: { title: string; icon: typeof PhoneCall }) {
  return (
    <CardHeader className="space-y-2 p-4 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
        >
          <Database className="h-3 w-3" /> Live Supabase backend
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        One customer record · owner and deadline · who/what/when audit trail
      </p>
    </CardHeader>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" /> Loading live CRM record…
    </div>
  );
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm text-destructive">
      <span>Backend error: {message}</span>
      <Button size="sm" variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}

function LeadStrip({ lead }: { lead: AssignmentLead }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
      <span className="font-semibold">{lead.name}</span>
      <span className="text-muted-foreground">{lead.phone}</span>
      <Badge variant="outline" className="capitalize">
        {lead.stage.replaceAll("-", " ")}
      </Badge>
      <span className="ml-auto text-muted-foreground">
        Updated {new Date(lead.updated_at).toLocaleString("en-IN")}
      </span>
    </div>
  );
}

function CallForm({
  lead,
  snapshot,
  reload,
}: {
  lead: AssignmentLead;
  snapshot: AssignmentSnapshot;
  reload: () => Promise<void>;
}) {
  const [outcome, setOutcome] = useState(lead.call_outcome ?? "Interested in visiting this week");
  const [nextAction, setNextAction] = useState(
    lead.next_action ?? "Confirm property and schedule tour",
  );
  const [dueAt, setDueAt] = useState(
    lead.next_action_due ? toLocalDateTimeInput(new Date(lead.next_action_due)) : twoHoursFromNow(),
  );
  const [variant, setVariant] = useState(lead.script_variant ?? "A");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!outcome.trim() || !nextAction.trim() || !dueAt) {
      toast.error("Outcome, next action and deadline are required.");
      return;
    }
    setSaving(true);
    try {
      await recordAssignmentCall({
        leadId: lead.id,
        outcome: outcome.trim(),
        nextAction: nextAction.trim(),
        dueAt: new Date(dueAt).toISOString(),
        scriptVariant: variant,
      });
      await reload();
      toast.success("Call saved to Supabase", {
        description: "Owner, deadline and audit event were updated together.",
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not save the call.");
    } finally {
      setSaving(false);
    }
  };

  const leakage = snapshot.leakage.find((item) => item.id === lead.id);

  const rescue = async () => {
    setSaving(true);
    try {
      await rescueAssignmentLead(lead.id);
      await reload();
      toast.success("Lead rescued", {
        description: "Assigned to Yash with a two-hour follow-up SLA.",
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not rescue the lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardContent className="space-y-3 p-4 pt-2">
      <LeadStrip lead={lead} />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="assignment-call-outcome">Call outcome</Label>
          <Input
            id="assignment-call-outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="assignment-call-script">Script variant</Label>
          <Select value={variant} onValueChange={setVariant}>
            <SelectTrigger id="assignment-call-script">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Variant A</SelectItem>
              <SelectItem value="B">Variant B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="assignment-call-due">Deadline</Label>
          <Input
            id="assignment-call-due"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </div>
        <div className="space-y-1 md:col-span-3">
          <Label htmlFor="assignment-next-action">Next action</Label>
          <Input
            id="assignment-next-action"
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
          />
        </div>
        <Button className="self-end" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save call + next step"}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Idea 1 · Lead Leakage Guard
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {leakage?.leakage_reason ?? "Healthy"} · risk score {leakage?.risk_score ?? 0}/100
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={rescue} disabled={saving}>
            Assign + schedule rescue
          </Button>
        </div>
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="h-4 w-4 text-violet-600" /> Idea 2 · Script Experiment Tracker
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {snapshot.performance.map((row) => (
              <div key={row.variant} className="rounded border bg-background p-2 text-xs">
                <div className="font-semibold">Variant {row.variant}</div>
                <div className="text-muted-foreground">
                  {row.leads_used} leads · {row.bookings_generated} bookings
                </div>
                <div className="font-mono text-primary">
                  {row.booking_conversion_percent}% conversion
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  );
}

export function AssignmentCallModule() {
  const { snapshot, error, loading, reload } = useAssignmentSnapshot();
  const lead = snapshot?.leads[0];
  return (
    <Card className="border-primary/25 shadow-sm">
      <BackendHeader title="Module 1 · M-POWER Call" icon={PhoneCall} />
      {loading && !snapshot ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={() => void reload()} />
      ) : lead && snapshot ? (
        <CallForm
          key={`${lead.id}-${lead.updated_at}`}
          lead={lead}
          snapshot={snapshot}
          reload={reload}
        />
      ) : (
        <p className="p-4 text-sm">No assignment lead found.</p>
      )}
    </Card>
  );
}

function TourForm({ lead, reload }: { lead: AssignmentLead; reload: () => Promise<void> }) {
  const [propertyName, setPropertyName] = useState(lead.tour_property ?? "Gharpayy Koramangala");
  const [scheduledAt, setScheduledAt] = useState(
    lead.tour_scheduled_at
      ? toLocalDateTimeInput(new Date(lead.tour_scheduled_at))
      : tomorrowAfternoon(),
  );
  const [saving, setSaving] = useState(false);

  const schedule = async () => {
    if (!propertyName.trim() || !scheduledAt) return;
    setSaving(true);
    try {
      await scheduleAssignmentTour({
        leadId: lead.id,
        propertyName: propertyName.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      await reload();
      toast.success("Tour scheduled in Supabase");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not schedule the tour.");
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildTourConfirmation(lead, propertyName, scheduledAt));
      toast.success("Confirmation message copied");
    } catch {
      toast.error("Clipboard access was blocked. Copy the confirmation manually.");
    }
  };

  return (
    <CardContent className="grid gap-2 p-3 pt-1 md:grid-cols-[minmax(180px,1fr)_minmax(200px,1fr)_auto_auto]">
      <div className="space-y-1">
        <Label htmlFor="assignment-property">Property</Label>
        <Input
          id="assignment-property"
          value={propertyName}
          onChange={(event) => setPropertyName(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="assignment-tour-time">Tour time</Label>
        <Input
          id="assignment-tour-time"
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
        />
      </div>
      <Button className="self-end" onClick={schedule} disabled={saving}>
        {saving ? "Saving…" : "Schedule tour"}
      </Button>
      <Button className="self-end" variant="outline" onClick={copyMessage}>
        Copy WhatsApp
      </Button>
    </CardContent>
  );
}

export function AssignmentTourModule() {
  const { snapshot, error, loading, reload } = useAssignmentSnapshot();
  const lead = snapshot?.leads[0];
  return (
    <Card className="border-primary/25 shadow-sm">
      <BackendHeader title="Module 2 · Booking Flow Split" icon={CalendarCheck} />
      {loading && !snapshot ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={() => void reload()} />
      ) : lead ? (
        <TourForm key={`${lead.id}-${lead.updated_at}`} lead={lead} reload={reload} />
      ) : (
        <p className="p-4 text-sm">No assignment lead found.</p>
      )}
    </Card>
  );
}

function ClosingForm({
  lead,
  snapshot,
  reload,
}: {
  lead: AssignmentLead;
  snapshot: AssignmentSnapshot;
  reload: () => Promise<void>;
}) {
  const [monthlyRent, setMonthlyRent] = useState(String(lead.monthly_rent ?? lead.budget ?? 18000));
  const [saving, setSaving] = useState(false);

  const close = async () => {
    const rent = Number(monthlyRent);
    if (!Number.isFinite(rent) || rent <= 0) {
      toast.error("Enter a valid monthly rent.");
      return;
    }
    setSaving(true);
    try {
      await closeAssignmentBooking({ leadId: lead.id, monthlyRent: rent });
      await reload();
      toast.success("Paid booking closed", {
        description: "The same lead is now booked and the audit trail is complete.",
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not close the booking.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardContent className="space-y-3 p-4 pt-2">
      <LeadStrip lead={lead} />
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <Label htmlFor="assignment-rent">Agreed monthly rent</Label>
          <Input
            id="assignment-rent"
            type="number"
            min="1"
            value={monthlyRent}
            onChange={(event) => setMonthlyRent(event.target.value)}
          />
        </div>
        <Button className="self-end" onClick={close} disabled={saving || lead.stage === "booked"}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {lead.stage === "booked"
            ? "Booking completed"
            : saving
              ? "Closing…"
              : "Mark paid + close booking"}
        </Button>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4" /> Live who/what/when trail
        </div>
        <div className="divide-y rounded-lg border">
          {snapshot.activities
            .filter((activity) => activity.lead_id === lead.id)
            .slice(0, 6)
            .map((activity) => (
              <div
                key={activity.id}
                className="grid gap-1 px-3 py-2 text-xs md:grid-cols-[140px_1fr_auto]"
              >
                <span className="font-medium">{activity.actor_name}</span>
                <span>{activity.description}</span>
                <span className="text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
        </div>
      </div>
    </CardContent>
  );
}

export function AssignmentClosingModule() {
  const { snapshot, error, loading, reload } = useAssignmentSnapshot();
  const lead = snapshot?.leads[0];
  return (
    <Card className="border-primary/25 shadow-sm">
      <BackendHeader title="Module 3 · Closing Desk" icon={CheckCircle2} />
      {loading && !snapshot ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={() => void reload()} />
      ) : lead && snapshot ? (
        <ClosingForm
          key={`${lead.id}-${lead.updated_at}`}
          lead={lead}
          snapshot={snapshot}
          reload={reload}
        />
      ) : (
        <p className="p-4 text-sm">No assignment lead found.</p>
      )}
    </Card>
  );
}
