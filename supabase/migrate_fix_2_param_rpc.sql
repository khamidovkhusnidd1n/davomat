-- 2-parametrli get_or_create_today_lesson funksiyasini race condition (unique_violation)dan himoya qilish
CREATE OR REPLACE FUNCTION public.get_or_create_today_lesson(p_group_id UUID, p_lesson_title TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lesson_id UUID;
    v_today DATE := current_date;
BEGIN
    -- 1) Dars bormi tekshiramiz (jadvaldan tashqari darslarni)
    SELECT id INTO v_lesson_id
    FROM public.lessons
    WHERE group_id = p_group_id AND lesson_date = v_today AND schedule_id IS NULL
    LIMIT 1;

    -- 2) Agar yo'q bo'lsa, yaratamiz
    IF v_lesson_id IS NULL THEN
        BEGIN
            INSERT INTO public.lessons (group_id, lesson_date, title, schedule_id)
            VALUES (p_group_id, v_today, p_lesson_title, NULL)
            RETURNING id INTO v_lesson_id;
        EXCEPTION WHEN unique_violation THEN
            -- Parallel so'rovda yaratib ketilgan bo'lsa, o'shani tanlaymiz
            SELECT id INTO v_lesson_id
            FROM public.lessons
            WHERE group_id = p_group_id AND lesson_date = v_today AND schedule_id IS NULL
            LIMIT 1;
        END;
    END IF;

    RETURN v_lesson_id;
END;
$$;
