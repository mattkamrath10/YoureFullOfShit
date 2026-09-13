-- Expand YFOS categories. Keep existing rows (unique on slug).
-- Existing: unbelievable, paranormal, funny, awkward, coincidences, unexplained

insert into public.categories (slug, name, description, sort_order) values
  ('near-death', 'Near-Death Experiences', 'Close calls, survival, and almost-didn''t-make-it stories.', 7),
  ('ufos-strange', 'UFOs & Strange Encounters', 'Lights, craft, and encounters that don''t fit.', 8),
  ('creepy', 'Creepy Encounters', 'Uneasy meetings and skin-crawling moments.', 9),
  ('dreams-came-true', 'Dreams That Came True', 'Dreams that later lined up with reality.', 10),
  ('premonitions', 'Premonitions', 'Gut feelings and knowing before it happened.', 11),
  ('weird-things', 'Weird Things That Happened', 'Odd events that still don''t make sense.', 12),
  ('unbelievable-luck', 'Unbelievable Luck', 'Impossible good fortune.', 13),
  ('bad-luck', 'Bad Luck', 'When everything goes wrong in spectacular fashion.', 14),
  ('close-calls', 'Close Calls', 'Almost disasters and narrow escapes.', 15),
  ('survival', 'Survival Stories', 'Getting through something that should''ve ended differently.', 16),
  ('accidents-disasters', 'Accidents & Disasters', 'Crashes, collapses, and chaos.', 17),
  ('crime', 'Crime & Strange Crimes', 'Weird crimes and brushes with the law.', 18),
  ('scams', 'Scams & Con Artists', 'Cons, schemes, and near-misses.', 19),
  ('mystery-suspicion', 'Mystery & Suspicion', 'Something was off — and you still wonder.', 20),
  ('family-secrets', 'Family Secrets', 'What the family never talked about.', 21),
  ('relationships', 'Relationship Stories', 'Love, drama, and everything between.', 22),
  ('dating-disasters', 'Dating Disasters', 'Dates that went sideways fast.', 23),
  ('love-stories', 'Love Stories', 'The good ones that still feel unbelievable.', 24),
  ('breakups-betrayals', 'Breakups & Betrayals', 'When trust shattered.', 25),
  ('marriage-weddings', 'Marriage & Weddings', 'Proposals, weddings, and married-life chaos.', 26),
  ('workplace', 'Workplace Stories', 'Jobs, coworkers, bosses, and office insanity.', 27),
  ('school-college', 'School & College Stories', 'Campus chaos and classroom legends.', 28),
  ('travel-vacation', 'Travel & Vacation Stories', 'Trips that went off-script.', 29),
  ('road-trips', 'Road Trips & Driving', 'Miles, mishaps, and highway stories.', 30),
  ('stranger-encounters', 'Stranger Encounters', 'People you met once and never forgot.', 31),
  ('kindness', 'Random Acts of Kindness', 'Unexpected goodness from strangers.', 32),
  ('revenge', 'Acts of Revenge', 'Getting even — or trying to.', 33),
  ('karma', 'Karma', 'What goes around… apparently.', 34),
  ('childhood', 'Childhood Stories', 'Kid years that still feel wild.', 35),
  ('teen-years', 'Teen Years', 'Teenage decisions with lasting stories.', 36),
  ('party-stories', 'Wild Party Stories', 'Nights that shouldn''t have happened.', 37),
  ('celebrity-encounters', 'Celebrity Encounters', 'Run-ins with famous people.', 38),
  ('famous-people', 'Famous People', 'Stories involving well-known names.', 39),
  ('sports', 'Sports Stories', 'Games, rivals, and athletic chaos.', 40),
  ('animal-stories', 'Animal Stories', 'Wildlife and creatures behaving strangely.', 41),
  ('pet-stories', 'Pet Stories', 'Dogs, cats, and household legends.', 42),
  ('medical-mysteries', 'Medical Mysteries', 'Bodies and diagnoses that defy explanation.', 43),
  ('family-history', 'Historical / Family History', 'Passed-down family legends.', 44),
  ('money-wealth', 'Money & Unexpected Wealth', 'Windfalls, losses, and money shocks.', 45),
  ('lost-found', 'Lost & Found', 'Things (and people) that disappeared — or returned.', 46),
  ('tech-gone-wrong', 'Technology Gone Wrong', 'When gadgets betrayed you.', 47),
  ('internet-social', 'Internet & Social Media', 'Online drama that spilled into real life.', 48),
  ('hidden-talents', 'Hidden Talents', 'Unexpected skills revealed under pressure.', 49),
  ('impossible-feats', 'Impossible Feats', 'Things that shouldn''t have been possible.', 50),
  ('cant-explain', 'I Can''t Explain It', 'No category fits — and neither does reality.', 51),
  ('other', 'Other', 'Anything that doesn''t fit elsewhere.', 52)
on conflict (slug) do nothing;

-- Ensure existing names stay; optionally tighten sort for originals
update public.categories set sort_order = 1 where slug = 'unbelievable';
update public.categories set sort_order = 2 where slug = 'paranormal';
update public.categories set sort_order = 3 where slug = 'funny';
update public.categories set sort_order = 4 where slug = 'awkward';
update public.categories set sort_order = 5 where slug = 'coincidences';
update public.categories set sort_order = 6 where slug = 'unexplained';
