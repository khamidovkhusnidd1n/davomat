-- Bazadagi "XX:XX darsi" formatidagi noto'g'ri dars nomlarini 
-- guruh nomi va fan nomi bilan to'g'rilash skripti
-- Masalan: "09:00 darsi" → "Rangtasvir (09:00)"

UPDATE public.lessons l
SET title = COALESCE(g.course_name, g.name) || ' (' || 
    SUBSTRING(l.title FROM '^([0-9]{2}:[0-9]{2})') || ')'
FROM public.groups g
WHERE l.group_id = g.id
  AND l.title ~ '^[0-9]{2}:[0-9]{2} darsi$';
