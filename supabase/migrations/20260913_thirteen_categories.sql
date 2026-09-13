-- YFOS: 13 categories (12 themed + Other). Inviting first, heavier later, Other last.
-- Safe to re-run. Remaps stories before deleting old category rows.

-- ---------------------------------------------------------------------------
-- 1) Upsert the thirteen categories (sort_order 1..13)
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, description, sort_order) values
  ('funny', 'Funny', 'Hilarious moments, jokes that went wrong, and stories that still make you laugh.', 1),
  ('coincidences', 'Coincidences', 'Too-perfect timing, chance meetings, and what-are-the-odds moments.', 2),
  ('relationships', 'Relationships', 'Love, dating, breakups, friendships, and everything between.', 3),
  ('wild-unbelievable', 'Wild / Unbelievable', 'Stories so wild they sound made up — you decide.', 4),
  ('inspiring', 'Inspiring', 'Comebacks, kindness, courage, and moments that lift you up.', 5),
  ('adventure', 'Adventure', 'Travel, close calls, survival, trips, and high-stakes outings.', 6),
  ('paranormal', 'Paranormal', 'Ghosts, UFOs, premonitions, and things that do not fit.', 7),
  ('everyday-life', 'Everyday Life', 'Work, school, family, pets, and ordinary days that went sideways.', 8),
  ('crime-scams', 'Crime & Scams', 'Crime brushes, fraud, cons, and brushes with the justice system.', 9),
  ('controversial', 'Controversial', 'Hot takes, messy situations, and stories that spark arguments.', 10),
  ('politics-current-events', 'Politics & Current Events', 'Politics, government, public figures, and stories tied to the news.', 11),
  ('dark-disturbing', 'Dark & Disturbing', 'Heavy, unsettling, or disturbing experiences. Separate from politics.', 12),
  ('other', 'Other', 'Anything that does not fit the categories above.', 13)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 2) Remap every story onto one of the thirteen
-- ---------------------------------------------------------------------------
create temporary table if not exists _yfos_cat_map (
  old_slug text primary key,
  new_slug text not null
) on commit drop;

truncate _yfos_cat_map;
insert into _yfos_cat_map (old_slug, new_slug) values
  ('funny', 'funny'),
  ('coincidences', 'coincidences'),
  ('relationships', 'relationships'),
  ('wild-unbelievable', 'wild-unbelievable'),
  ('inspiring', 'inspiring'),
  ('adventure', 'adventure'),
  ('paranormal', 'paranormal'),
  ('everyday-life', 'everyday-life'),
  ('crime-scams', 'crime-scams'),
  ('controversial', 'controversial'),
  ('politics-current-events', 'politics-current-events'),
  ('dark-disturbing', 'dark-disturbing'),
  ('other', 'other'),
  ('unbelievable', 'wild-unbelievable'),
  ('weird-things', 'wild-unbelievable'),
  ('unbelievable-luck', 'wild-unbelievable'),
  ('impossible-feats', 'wild-unbelievable'),
  ('cant-explain', 'other'),
  ('unexplained', 'other'),
  ('awkward', 'everyday-life'),
  ('workplace', 'everyday-life'),
  ('school-college', 'everyday-life'),
  ('childhood', 'everyday-life'),
  ('teen-years', 'everyday-life'),
  ('party-stories', 'everyday-life'),
  ('pet-stories', 'everyday-life'),
  ('animal-stories', 'everyday-life'),
  ('tech-gone-wrong', 'everyday-life'),
  ('internet-social', 'everyday-life'),
  ('hidden-talents', 'everyday-life'),
  ('lost-found', 'everyday-life'),
  ('money-wealth', 'everyday-life'),
  ('family-history', 'everyday-life'),
  ('family-secrets', 'relationships'),
  ('love-stories', 'relationships'),
  ('dating-disasters', 'relationships'),
  ('breakups-betrayals', 'relationships'),
  ('marriage-weddings', 'relationships'),
  ('near-death', 'adventure'),
  ('close-calls', 'adventure'),
  ('survival', 'adventure'),
  ('accidents-disasters', 'adventure'),
  ('travel-vacation', 'adventure'),
  ('road-trips', 'adventure'),
  ('sports', 'adventure'),
  ('bad-luck', 'adventure'),
  ('ufos-strange', 'paranormal'),
  ('creepy', 'paranormal'),
  ('dreams-came-true', 'paranormal'),
  ('premonitions', 'paranormal'),
  ('medical-mysteries', 'dark-disturbing'),
  ('revenge', 'controversial'),
  ('mystery-suspicion', 'controversial'),
  ('karma', 'controversial'),
  ('stranger-encounters', 'controversial'),
  ('crime', 'crime-scams'),
  ('scams', 'crime-scams'),
  ('crime-criminal-justice', 'crime-scams'),
  ('scams-fraud', 'crime-scams'),
  ('politics-government', 'politics-current-events'),
  ('corruption-abuse-of-power', 'politics-current-events'),
  ('corporate-financial-misconduct', 'politics-current-events'),
  ('whistleblowers-cover-ups', 'politics-current-events'),
  ('government-secrets-investigations', 'politics-current-events'),
  ('social-issues-injustice', 'politics-current-events'),
  ('celebrity-encounters', 'politics-current-events'),
  ('famous-people', 'politics-current-events'),
  ('kindness', 'inspiring');

update public.stories s
set category_id = c_new.id
from public.categories c_old
join _yfos_cat_map m on m.old_slug = c_old.slug
join public.categories c_new on c_new.slug = m.new_slug
where s.category_id = c_old.id
  and c_old.slug is distinct from m.new_slug;

-- Any leftover unknown slug → other
update public.stories s
set category_id = (select id from public.categories where slug = 'other' limit 1)
where s.category_id in (
  select id from public.categories
  where slug not in (
    'funny','coincidences','relationships','wild-unbelievable','inspiring',
    'adventure','paranormal','everyday-life','crime-scams','controversial',
    'politics-current-events','dark-disturbing','other'
  )
);

-- ---------------------------------------------------------------------------
-- 3) Delete categories that are not in the thirteen
-- ---------------------------------------------------------------------------
delete from public.categories
where slug not in (
  'funny','coincidences','relationships','wild-unbelievable','inspiring',
  'adventure','paranormal','everyday-life','crime-scams','controversial',
  'politics-current-events','dark-disturbing','other'
);

-- ---------------------------------------------------------------------------
-- 4) Re-assert sort_order 1..13
-- ---------------------------------------------------------------------------
update public.categories set sort_order = 1 where slug = 'funny';
update public.categories set sort_order = 2 where slug = 'coincidences';
update public.categories set sort_order = 3 where slug = 'relationships';
update public.categories set sort_order = 4 where slug = 'wild-unbelievable';
update public.categories set sort_order = 5 where slug = 'inspiring';
update public.categories set sort_order = 6 where slug = 'adventure';
update public.categories set sort_order = 7 where slug = 'paranormal';
update public.categories set sort_order = 8 where slug = 'everyday-life';
update public.categories set sort_order = 9 where slug = 'crime-scams';
update public.categories set sort_order = 10 where slug = 'controversial';
update public.categories set sort_order = 11 where slug = 'politics-current-events';
update public.categories set sort_order = 12 where slug = 'dark-disturbing';
update public.categories set sort_order = 13 where slug = 'other';
