import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ClientOnly } from "@/components/ClientOnly";
import { ClosingBoard } from "@/components/commitments/ClosingBoard";
import { HowButton } from "@/components/common/HowButton";
import { RoleGuaranteePanel } from "@/components/workflow/RoleGuaranteePanel";
import { AssignmentClosingModule } from "@/components/assignment/AssignmentWorkflow";

export const Route = createFileRoute("/closing")({
  head: () => ({
    meta: [
      { title: "Closing Mission — Workflow Guarantee | Gharpayy" },
      { name: "description", content: "Paid-booking mission, closing opportunity supply, payment-intent protection and promise accuracy in one operating screen." },
      { property: "og:title", content: "Closing Mission — Workflow Guarantee" },
      { property: "og:description", content: "Start from paid bookings, work backward to required post-tour opportunities, then protect every dated close action." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClosingPage,
});

function ClosingPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Closing Mission</h1>
            <HowButton
              withText
              title="What this board is for"
              why="Closing exists to create paid bookings. Promises and calls are execution instruments, not the final result."
              howToExecute={[
                "Start from the paid-booking gap and required closing opportunity supply.",
                "Work payment intent, high-intent post-tour customers, room-hold expiry and decision blockers before generic follow-ups.",
                "Every quote must have a dated next action and every promise must be settled or moved with a reason.",
              ]}
              whatNotToDo={["Never use raw call volume as the primary definition of Closing success.", "Never let a payment-ready customer sit behind routine nurture work.", "Never move a close date without writing why."]}
              problemsThatCanOccur={["Closing can be blamed when post-tour opportunity supply is insufficient.", "Optimistic promises can inflate the apparent forecast without payment movement."]}
              branches={[{ condition: "Closing opportunities are below the required input", then: "Raise the upstream shortage: unresolved post-tour outcomes → quote-ready tours → tour-ready customers → supply blockers." }]}
              doneWhen="Paid-booking outcome is achieved or the remaining gap is explicitly classified as upstream, conversion, dependency or execution failure."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Paid-booking outcome first. Promise accuracy remains underneath as the commitment-control layer.
          </p>
        </header>

        <RoleGuaranteePanel role="closing" />

        <AssignmentClosingModule />

        <ClientOnly fallback={<p className="py-10 text-center text-sm text-muted-foreground">Loading closing mission…</p>}>
          <ClosingBoard />
        </ClientOnly>
      </div>
    </AppShell>
  );
}
