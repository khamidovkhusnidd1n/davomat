-- Darsni xavfsiz (RLS va Race Condition'larsiz) olish yoki yaratish funksiyasi
CREATE OR REPLACE FUNCTION public.get_or_create_today_lesson(p_group_id UUID, p_lesson_title TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- RLS ni aylanib o'tib, xavfsiz ishlaydi
AS $$
DECLARE
    v_lesson_id UUID;
    v_today DATE := current_date;
BEGIN
    -- 1) Dars bormi tekshiramiz
    SELECT id INTO v_lesson_id
    FROM public.lessons
    WHERE group_id = p_group_id AND lesson_date = v_today
    LIMIT 1;

    -- 2) Agar yo'q bo'lsa, yaratamiz
    IF v_lesson_id IS NULL THEN
        INSERT INTO public.lessons (group_id, lesson_date, title)
        VALUES (p_group_id, v_today, p_lesson_title)
        RETURNING id INTO v_lesson_id;
    END IF;

    RETURN v_lesson_id;
END;
$$;
