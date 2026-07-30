-- 1) schedules jadvalidagi cheklovni olib tashlash va start_time bilan yangi unikal cheklov qo'shish
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_group_day_unique;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_group_day_time_unique UNIQUE (group_id, day_of_week, start_time);

-- 2) lessons jadvaliga schedule_id ustunini qo'shish
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL;

-- 3) lessons jadvalidagi (group_id, lesson_date) unikal cheklovini olib tashlash
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_group_date_unique;

-- 4) (group_id, lesson_date, schedule_id) uchun unikal cheklov qo'shish
ALTER TABLE public.lessons ADD CONSTRAINT lessons_group_date_schedule_unique UNIQUE (group_id, lesson_date, schedule_id);

-- 5) schedule_id NULL bo'lgan ad-hoc darslar uchun kuniga faqat 1 taga ruxsat berish cheklovi (Partial Index)
CREATE UNIQUE INDEX IF NOT EXISTS lessons_group_date_schedule_null_idx 
ON public.lessons (group_id, lesson_date) 
WHERE schedule_id IS NULL;

-- 6) get_or_create_today_lesson funksiyasini yangilash (overload va race condition'larni istisno qilish bilan)
CREATE OR REPLACE FUNCTION public.get_or_create_today_lesson(
    p_group_id UUID, 
    p_lesson_title TEXT,
    p_schedule_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lesson_id UUID;
    v_today DATE := current_date;
BEGIN
    -- 1) Dars mavjudligini tekshirish
    IF p_schedule_id IS NULL THEN
        SELECT id INTO v_lesson_id
        FROM public.lessons
        WHERE group_id = p_group_id AND lesson_date = v_today AND schedule_id IS NULL
        LIMIT 1;
    ELSE
        SELECT id INTO v_lesson_id
        FROM public.lessons
        WHERE group_id = p_group_id AND lesson_date = v_today AND schedule_id = p_schedule_id
        LIMIT 1;
    END IF;

    -- 2) Yo'q bo'lsa, yaratish (race condition'lar uchun EXCEPTION block)
    IF v_lesson_id IS NULL THEN
        BEGIN
            INSERT INTO public.lessons (group_id, lesson_date, title, schedule_id)
            VALUES (p_group_id, v_today, p_lesson_title, p_schedule_id)
            RETURNING id INTO v_lesson_id;
        EXCEPTION WHEN unique_violation THEN
            -- Agar parallel so'rovda yaratib ketilgan bo'lsa, o'shani select qilamiz
            IF p_schedule_id IS NULL THEN
                SELECT id INTO v_lesson_id
                FROM public.lessons
                WHERE group_id = p_group_id AND lesson_date = v_today AND schedule_id IS NULL
                LIMIT 1;
            ELSE
                SELECT id INTO v_lesson_id
                FROM public.lessons
                WHERE group_id = p_group_id AND lesson_date = v_today AND schedule_id = p_schedule_id
                LIMIT 1;
            END IF;
        END;
    END IF;

    RETURN v_lesson_id;
END;
$$;
