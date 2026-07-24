-- Davomat jadvaliga kech qolgan soatlarni hisoblash uchun ustun qo'shish
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS late_hours INTEGER DEFAULT 0;

-- Faqat 0 dan 6 gacha raqam kiritilishi uchun tekshiruv (1 kun = 6 soat dars)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.check_constraints
        WHERE constraint_name = 'attendance_late_hours_check'
    ) THEN
        ALTER TABLE public.attendance
            ADD CONSTRAINT attendance_late_hours_check CHECK (late_hours >= 0 AND late_hours <= 6);
    END IF;
END $$;
