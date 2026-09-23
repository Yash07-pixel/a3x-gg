# Gharpayy Lead Management CRM assignment

This implementation connects three existing product modules to one Supabase-backed lead workflow.

## Activated modules

1. **M-POWER Call** (`/leads`) records the call result, owner, next action, deadline, and script variant.
2. **Booking Flow Split** (`/booking-flow-split`) schedules a property tour and creates a WhatsApp-ready confirmation.
3. **Closing Desk** (`/closing`) records rent/payment, closes the booking, and displays the audit trail.

## Two new ideas

- **Lead Leakage Guard** scores unassigned, unscheduled, and overdue leads and provides a one-click rescue action.
- **Script Experiment Tracker** compares A/B call scripts using leads, tours, bookings, and conversion percentage.

## Backend setup

1. Create a Supabase project.
2. Run `drizzle/migrations/0003_assignment_crm.sql` in the Supabase SQL editor.
3. Create `.env.local` with:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

4. Run `npm install` and `npm run dev`.

The migration creates indexed CRM tables, row-level security policies, audit events, leakage and experiment views, plus fictional demo data. Never commit `.env.local`.

## Interview demo flow

Open `/leads` and save a call or rescue the overdue lead. Continue to `/booking-flow-split` to schedule a visit and copy the confirmation message. Finish on `/closing` to show the shared record and live who/what/when activity trail.
