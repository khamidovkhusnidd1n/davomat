-- Tizimda o'tilgan darslarni avtomat hisoblab teacher_subjects jadvaliga yozadigan trigger
CREATE OR REPLACE FUNCTION update_teacher_completed_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_subject_id UUID;
  v_theory_hours INT := 0;
  v_practice_hours INT := 0;
BEGIN
  -- Determine teacher_id and subject_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_teacher_id := OLD.teacher_id;
    v_subject_id := OLD.subject_id;
  ELSE
    v_teacher_id := NEW.teacher_id;
    v_subject_id := NEW.subject_id;
  END IF;

  -- Calculate total theory hours for this teacher and subject
  SELECT COALESCE(SUM(
    CASE 
      WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
        ROUND(EXTRACT(EPOCH FROM (end_time - start_time))/3600)
      ELSE 2
    END
  ), 0) INTO v_theory_hours
  FROM lessons
  WHERE teacher_id = v_teacher_id 
    AND subject_id = v_subject_id
    AND lesson_type = 'theory';

  -- Calculate total practice hours for this teacher and subject
  SELECT COALESCE(SUM(
    CASE 
      WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
        ROUND(EXTRACT(EPOCH FROM (end_time - start_time))/3600)
      ELSE 2
    END
  ), 0) INTO v_practice_hours
  FROM lessons
  WHERE teacher_id = v_teacher_id 
    AND subject_id = v_subject_id
    AND lesson_type = 'practice';

  -- Update teacher_subjects
  UPDATE teacher_subjects
  SET 
    completed_theory_hours = v_theory_hours,
    completed_practice_hours = v_practice_hours,
    completed_hours = v_theory_hours + v_practice_hours
  WHERE teacher_id = v_teacher_id 
    AND subject_id = v_subject_id;

  RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lessons table
DROP TRIGGER IF EXISTS trg_update_teacher_completed_hours ON lessons;
CREATE TRIGGER trg_update_teacher_completed_hours
AFTER INSERT OR UPDATE OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_teacher_completed_hours();

-- Dastlabki barcha malumotlarni moslashtirish (Sinxronizatsiya)
-- Mavjud barcha o'qituvchilarning soatlarini lessons jadvaliga qarab yangilaymiz.
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Avval barchasini 0 qilib qo'yamiz (faqat darsi borlar keyin yangilanadi)
  UPDATE teacher_subjects SET completed_theory_hours = 0, completed_practice_hours = 0, completed_hours = 0;

  FOR rec IN SELECT DISTINCT teacher_id, subject_id FROM lessons
  LOOP
    -- theory
    UPDATE teacher_subjects ts
    SET completed_theory_hours = (
      SELECT COALESCE(SUM(
        CASE WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (end_time - start_time))/3600) ELSE 2 END
      ), 0) FROM lessons WHERE teacher_id = rec.teacher_id AND subject_id = rec.subject_id AND lesson_type = 'theory'
    ),
    completed_practice_hours = (
      SELECT COALESCE(SUM(
        CASE WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (end_time - start_time))/3600) ELSE 2 END
      ), 0) FROM lessons WHERE teacher_id = rec.teacher_id AND subject_id = rec.subject_id AND lesson_type = 'practice'
    )
    WHERE ts.teacher_id = rec.teacher_id AND ts.subject_id = rec.subject_id;
  END LOOP;
  
  -- Jami soatni ham yangilaymiz
  UPDATE teacher_subjects SET completed_hours = completed_theory_hours + completed_practice_hours;
END;
$$;
