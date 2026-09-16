-- S1: Stripe customer mapping. Do not apply to production until approved.
-- Does not create Stripe products or enable live billing.

create table if not exists public.billing_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
revoke all on public.billing_customers from anon, authenticated;
grant all on public.billing_customers to service_role;

drop policy if exists "Users read own billing customer" on public.billing_customers;
create policy "Users read own billing customer"
  on public.billing_customers for select to authenticated
  using (auth.uid() = user_id);
