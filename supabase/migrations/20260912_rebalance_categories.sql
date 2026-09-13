-- YFOS category rebalance: remove 8 low-value / overlapping categories,
-- add 8 serious subject-matter categories.
-- Stories on removed categories are remapped to cant-explain first (FK-safe).
-- Category names describe SUBJECT MATTER of user stories, not verified facts.

-- ---------------------------------------------------------------------------
-- Remap stories off categories we are about to remove
-- ---------------------------------------------------------------------------
update public.stories
set category_id = (select id from public.categories where slug = 'cant-explain' limit 1)
where category_id in (
  select id from public.categories
  where slug in (
    'crime',
    'scams',
    'famous-people',
    'road-trips',
    'teen-years',
    'love-stories',
    'marriage-weddings',
    'hidden-talents'
  )
);

-- ---------------------------------------------------------------------------
-- Remove exactly 8
-- ---------------------------------------------------------------------------
delete from public.categories
where slug in (
  'crime',
  'scams',
  'famous-people',
  'road-trips',
  'teen-years',
  'love-stories',
  'marriage-weddings',
  'hidden-talents'
);

-- ---------------------------------------------------------------------------
-- Add exactly 8 serious categories (subject-matter labels for user stories)
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, description, sort_order) values
  (
    'politics-government',
    'Politics & Government',
    'User stories involving politicians, elections, government decisions, political situations, or unusual experiences with government. Community votes what they believe — not factual verification.',
    53
  ),
  (
    'corruption-abuse-of-power',
    'Corruption & Abuse of Power',
    'User stories alleging corruption, abuse of authority, conflicts of interest, favoritism, cover-ups, or misuse of power. Allegations are not proven by posting.',
    54
  ),
  (
    'crime-criminal-justice',
    'Crime & Criminal Justice',
    'User stories involving crimes, arrests, investigations, court cases, law enforcement encounters, or unusual experiences with the justice system.',
    55
  ),
  (
    'scams-fraud',
    'Scams & Fraud',
    'User stories involving scams, fraud, deception, identity-related schemes, financial cons, or discovering they were tricked.',
    56
  ),
  (
    'corporate-financial-misconduct',
    'Corporate & Financial Misconduct',
    'User stories involving companies, executives, financial misconduct, workplace wrongdoing, unethical business practices, or questionable corporate behavior.',
    57
  ),
  (
    'whistleblowers-cover-ups',
    'Whistleblowers & Cover-Ups',
    'User stories from people who claim they discovered wrongdoing, exposed misconduct, witnessed something being hidden, or came forward with information.',
    58
  ),
  (
    'government-secrets-investigations',
    'Government Secrets & Investigations',
    'User stories involving investigations, secretive government activity, suspicious official actions, documents, or claims of hidden information.',
    59
  ),
  (
    'social-issues-injustice',
    'Social Issues & Injustice',
    'User stories involving discrimination, unfair treatment, institutional failures, inequality, or situations where someone believes they were seriously wronged.',
    60
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;
