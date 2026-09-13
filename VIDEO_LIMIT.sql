-- Raise story-media bucket object limit to 500 MB (keep same bucket)
-- 500 * 1024 * 1024 = 524288000

update storage.buckets
set file_size_limit = 524288000
where id = 'story-media';

-- Confirm
select id, name, file_size_limit, public
from storage.buckets
where id = 'story-media';
