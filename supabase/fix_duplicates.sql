-- 1. Bir kunda bir guruhda yaratilgan takroriy darslarni o'chirish (eskilari o'chadi, faqat 1 tasi qoladi)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER(
               PARTITION BY group_id, lesson_date 
               ORDER BY created_at DESC -- Eng oxirgi yaratilganini olib qolish uchun
           ) as row_num
    FROM public.lessons
)
DELETE FROM public.lessons
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- 2. Eskicha "09:00 darsi" degan nomlarni haqiqiy modul nomlariga o'zgartirish
UPDATE public.lessons l
SET title = COALESCE(g.course_name, g.name)
FROM public.groups g
WHERE l.group_id = g.id
  AND l.title ~ '^[0-9]{2}:[0-9]{2} darsi$';

-- 3. Eski constraintni o'chirish (lessons_group_date_unique)
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_group_date_unique;

-- 4. Yangi, qat'iy constraint qo'shish (1 kun = 1 dars)
ALTER TABLE public.lessons ADD CONSTRAINT lessons_group_date_unique UNIQUE (group_id, lesson_date);
