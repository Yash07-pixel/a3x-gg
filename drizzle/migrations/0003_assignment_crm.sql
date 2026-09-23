create extension if not exists pgcrypto;

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  name text not null,
  phone text not null,
  source text not null default 'website',
  preferred_area text,
  budget integer,
  move_in_date date,
  stage text not null default 'new',
  owner_name text,
  call_outcome text,
  next_action text,
  next_action_due timestamptz,
  tour_property text,
  tour_scheduled_at timestamptz,
  tour_status text not null default 'not-scheduled',
  closing_status text not null default 'open',
  monthly_rent integer,
  payment_status text not null default 'unpaid',
  script_variant text check (script_variant in ('A', 'B')),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, phone)
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  actor_name text not null,
  action_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  name text not null,
  variant text not null check (variant in ('A', 'B')),
  channel text not null default 'call',
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, variant)
);

create index if not exists crm_leads_workspace_stage_idx
  on public.crm_leads (workspace_id, stage);
create index if not exists crm_leads_next_action_due_idx
  on public.crm_leads (workspace_id, next_action_due);
create index if not exists crm_activities_lead_created_idx
  on public.crm_activities (lead_id, created_at desc);

create or replace function public.set_crm_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_crm_leads_updated_at on public.crm_leads;
create trigger set_crm_leads_updated_at
before update on public.crm_leads
for each row execute function public.set_crm_updated_at();

alter table public.crm_leads enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_scripts enable row level security;

drop policy if exists "Assignment workspace access" on public.crm_leads;
create policy "Assignment workspace access"
on public.crm_leads for all to anon, authenticated
using (workspace_id = 'yash-assignment')
with check (workspace_id = 'yash-assignment');

drop policy if exists "Assignment activity access" on public.crm_activities;
create policy "Assignment activity access"
on public.crm_activities for all to anon, authenticated
using (workspace_id = 'yash-assignment')
with check (workspace_id = 'yash-assignment');

drop policy if exists "Assignment script access" on public.crm_scripts;
create policy "Assignment script access"
on public.crm_scripts for all to anon, authenticated
using (workspace_id = 'yash-assignment')
with check (workspace_id = 'yash-assignment');

create or replace view public.crm_lead_leakage
with (security_invoker = true)
as
select
  id,
  workspace_id,
  name,
  next_action_due,
  case
    when owner_name is null then 'Unassigned lead'
    when next_action_due is null then 'No follow-up deadline'
    when next_action_due < now() then 'Follow-up overdue'
    else 'Healthy'
  end as leakage_reason,
  case
    when owner_name is null then 100
    when next_action_due is null then 85
    when next_action_due < now() then 70
    else 0
  end as risk_score
from public.crm_leads;

create or replace view public.crm_script_performance
with (security_invoker = true)
as
select
  script.name,
  script.variant,
  script.channel,
  count(lead.id)::integer as leads_used,
  count(lead.id) filter (where lead.tour_status in ('scheduled', 'completed'))::integer as tours_generated,
  count(lead.id) filter (where lead.stage = 'booked')::integer as bookings_generated,
  round(
    100.0 * count(lead.id) filter (where lead.stage = 'booked') / nullif(count(lead.id), 0),
    1
  ) as booking_conversion_percent
from public.crm_scripts script
left join public.crm_leads lead
  on lead.workspace_id = script.workspace_id
 and lead.script_variant = script.variant
where script.workspace_id = 'yash-assignment'
group by script.id, script.name, script.variant, script.channel;

grant select, insert, update, delete on public.crm_leads to anon, authenticated;
grant select, insert, update, delete on public.crm_activities to anon, authenticated;
grant select on public.crm_scripts to anon, authenticated;
grant select on public.crm_lead_leakage to anon, authenticated;
grant select on public.crm_script_performance to anon, authenticated;

insert into public.crm_leads (
  workspace_id, name, phone, source, preferred_area, budget, move_in_date,
  stage, owner_name, call_outcome, next_action, next_action_due, script_variant
)
values (
  'yash-assignment', 'Aarav Mehta', '+91 98765 43210', 'Instagram',
  'Koramangala', 18000, current_date + 10, 'contacted', 'Yash Sharma',
  'Interested in visiting this week', 'Confirm property and schedule tour',
  now() - interval '30 minutes', 'A'
)
on conflict (workspace_id, phone) do nothing;

insert into public.crm_scripts (workspace_id, name, variant, channel, body)
values
  ('yash-assignment', 'Convenience-first opener', 'A', 'call', 'Lead with location, move-in date, and tour availability.'),
  ('yash-assignment', 'Trust-first opener', 'B', 'call', 'Lead with verified properties, clear pricing, and resident support.')
on conflict (workspace_id, variant) do nothing;

insert into public.crm_activities (workspace_id, lead_id, actor_name, action_type, description)
select 'yash-assignment', id, 'System', 'lead_created', 'Lead created from Instagram campaign'
from public.crm_leads lead
where workspace_id = 'yash-assignment'
  and phone = '+91 98765 43210'
  and not exists (
    select 1 from public.crm_activities activity
    where activity.lead_id = lead.id and activity.action_type = 'lead_created'
  );
