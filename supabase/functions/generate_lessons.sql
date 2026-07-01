-- ============================================================================
-- DAVOMAD — Davomat Boshqaruv Tizimi (Attendance Management System)
-- File: functions/generate_lessons.sql
-- Description: Schedules jadvalini o'qib, joriy hafta uchun darslar yaratadi
-- ============================================================================
-- Foydalanish:
--   SELECT public.generate_lessons();                    -- barcha guruhlar uchun
--   SELECT public.generate_lessons('group-uuid-here');   -- bitta guruh uchun
-- ============================================================================


-- ============================================================================
-- 1) generate_lessons() — Joriy hafta uchun darslar yaratish
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_lessons(
    p_group_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    lesson_id   UUID,
    group_id    UUID,
    group_name  TEXT,
    lesson_date DATE,
    day_name    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_created_by UUID;
    v_count      INT := 0;
BEGIN
    -- -----------------------------------------------------------------------
    -- Joriy haftaning boshlanish sanasini aniqlash (ISO: Dushanba = 1-kun)
    -- PostgreSQL date_trunc('week', ...) Dushanbadan boshlanadi
    -- -----------------------------------------------------------------------
    v_week_start := date_trunc('week', CURRENT_DATE)::date;

    -- -----------------------------------------------------------------------
    -- created_by ni aniqlash:
    --   1) Parametr sifatida berilgan bo'lsa — undan foydalanish
    --   2) auth.uid() mavjud bo'lsa — undan foydalanish
    --   3) NULL qoladi (cron job orqali chaqirilganda)
    -- -----------------------------------------------------------------------
    v_created_by := COALESCE(p_created_by, auth.uid());

    -- -----------------------------------------------------------------------
    -- Asosiy INSERT:
    -- schedules jadvalidan hafta kunlarini o'qib,
    -- mos sanalarni hisoblab, lessons ga yozish.
    -- ON CONFLICT — agar bu guruh + sana uchun dars mavjud bo'lsa, o'tkazib yuborish.
    -- -----------------------------------------------------------------------
    RETURN QUERY
    WITH schedule_dates AS (
        SELECT
            s.group_id,
            g.name AS group_name,
            s.day_of_week,
            -- day_of_week: 1=Dushanba, 2=Seshanba, ...
            -- week_start Dushanba bo'lgani uchun: week_start + (day_of_week - 1)
            v_week_start + (s.day_of_week - 1) AS target_date
        FROM public.schedules s
        JOIN public.groups g ON g.id = s.group_id
        WHERE
            -- Agar p_group_id berilgan bo'lsa, faqat shu guruh
            -- Aks holda barcha guruhlar
            (p_group_id IS NULL OR s.group_id = p_group_id)
    ),
    inserted AS (
        INSERT INTO public.lessons (group_id, title, lesson_date, created_by)
        SELECT
            sd.group_id,
            -- Avtomatik sarlavha: "Guruh nomi — Kun nomi"
            sd.group_name || ' — ' ||
            CASE sd.day_of_week
                WHEN 1 THEN 'Dushanba'
                WHEN 2 THEN 'Seshanba'
                WHEN 3 THEN 'Chorshanba'
                WHEN 4 THEN 'Payshanba'
                WHEN 5 THEN 'Juma'
                WHEN 6 THEN 'Shanba'
            END || ' darsi',
            sd.target_date,
            v_created_by
        FROM schedule_dates sd
        -- Faqat o'tib ketmagan yoki bugungi sanalar uchun
        WHERE sd.target_date >= CURRENT_DATE
        -- Agar allaqachon mavjud bo'lsa — o'tkazib yuborish
        ON CONFLICT (group_id, lesson_date) DO NOTHING
        RETURNING
            lessons.id,
            lessons.group_id,
            lessons.lesson_date
    )
    SELECT
        ins.id          AS lesson_id,
        ins.group_id    AS group_id,
        sd.group_name   AS group_name,
        ins.lesson_date AS lesson_date,
        CASE EXTRACT(ISODOW FROM ins.lesson_date)::int
            WHEN 1 THEN 'Dushanba'
            WHEN 2 THEN 'Seshanba'
            WHEN 3 THEN 'Chorshanba'
            WHEN 4 THEN 'Payshanba'
            WHEN 5 THEN 'Juma'
            WHEN 6 THEN 'Shanba'
            WHEN 7 THEN 'Yakshanba'
        END AS day_name
    FROM inserted ins
    JOIN schedule_dates sd ON sd.group_id = ins.group_id
                          AND sd.target_date = ins.lesson_date;

END;
$$;

COMMENT ON FUNCTION public.generate_lessons(UUID, UUID) IS
    'Schedules jadvalini o''qib, joriy hafta uchun darslarni avtomatik yaratadi. '
    'Mavjud darslarni o''tkazib yuboradi (ON CONFLICT DO NOTHING). '
    'p_group_id = NULL bo''lsa barcha guruhlar uchun ishlaydi.';


-- ============================================================================
-- 2) generate_lessons_for_week() — Ma'lum hafta uchun darslar yaratish
-- Kelajak yoki o'tgan haftalar uchun ham dars yaratish imkoniyati
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_lessons_for_week(
    p_week_start DATE,
    p_group_id   UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    lesson_id   UUID,
    group_id    UUID,
    group_name  TEXT,
    lesson_date DATE,
    day_name    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_created_by UUID;
BEGIN
    -- -----------------------------------------------------------------------
    -- Berilgan sanani haftaning boshiga tushirish (Dushanba)
    -- -----------------------------------------------------------------------
    v_week_start := date_trunc('week', p_week_start)::date;
    v_created_by := COALESCE(p_created_by, auth.uid());

    RETURN QUERY
    WITH schedule_dates AS (
        SELECT
            s.group_id,
            g.name AS group_name,
            s.day_of_week,
            v_week_start + (s.day_of_week - 1) AS target_date
        FROM public.schedules s
        JOIN public.groups g ON g.id = s.group_id
        WHERE (p_group_id IS NULL OR s.group_id = p_group_id)
    ),
    inserted AS (
        INSERT INTO public.lessons (group_id, title, lesson_date, created_by)
        SELECT
            sd.group_id,
            sd.group_name || ' — ' ||
            CASE sd.day_of_week
                WHEN 1 THEN 'Dushanba'
                WHEN 2 THEN 'Seshanba'
                WHEN 3 THEN 'Chorshanba'
                WHEN 4 THEN 'Payshanba'
                WHEN 5 THEN 'Juma'
                WHEN 6 THEN 'Shanba'
            END || ' darsi',
            sd.target_date,
            v_created_by
        FROM schedule_dates sd
        ON CONFLICT (group_id, lesson_date) DO NOTHING
        RETURNING
            lessons.id,
            lessons.group_id,
            lessons.lesson_date
    )
    SELECT
        ins.id          AS lesson_id,
        ins.group_id    AS group_id,
        sd.group_name   AS group_name,
        ins.lesson_date AS lesson_date,
        CASE EXTRACT(ISODOW FROM ins.lesson_date)::int
            WHEN 1 THEN 'Dushanba'
            WHEN 2 THEN 'Seshanba'
            WHEN 3 THEN 'Chorshanba'
            WHEN 4 THEN 'Payshanba'
            WHEN 5 THEN 'Juma'
            WHEN 6 THEN 'Shanba'
            WHEN 7 THEN 'Yakshanba'
        END AS day_name
    FROM inserted ins
    JOIN schedule_dates sd ON sd.group_id = ins.group_id
                          AND sd.target_date = ins.lesson_date;
END;
$$;

COMMENT ON FUNCTION public.generate_lessons_for_week(DATE, UUID, UUID) IS
    'Berilgan hafta uchun darslarni yaratadi. '
    'p_week_start = istalgan sana (Dushanbaga tushiriladi). '
    'Kelajak haftalar uchun oldindan dars yaratish uchun ishlatiladi.';


-- ============================================================================
-- Done! generate_lessons funksiyalari yaratildi ✅
--
-- Foydalanish misollari:
--   -- Joriy hafta, barcha guruhlar:
--   SELECT * FROM public.generate_lessons();
--
--   -- Joriy hafta, bitta guruh:
--   SELECT * FROM public.generate_lessons('cccccccc-cccc-cccc-cccc-cccccccccc01');
--
--   -- Kelasi hafta uchun:
--   SELECT * FROM public.generate_lessons_for_week(CURRENT_DATE + INTERVAL '7 days');
--
--   -- Supabase cron job (pg_cron) orqali har Dushanba avtomatik chaqirish:
--   -- SELECT cron.schedule(
--   --     'generate-weekly-lessons',
--   --     '0 6 * * 1',  -- Har Dushanba soat 06:00
--   --     $$SELECT public.generate_lessons()$$
--   -- );
-- ============================================================================
