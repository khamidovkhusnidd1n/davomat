import json

with open('questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

sql = "-- 1. Jadval yaratish\n"
sql += "CREATE TABLE IF NOT EXISTS test_questions (\n"
sql += "  id SERIAL PRIMARY KEY,\n"
sql += "  text TEXT NOT NULL,\n"
sql += "  option_a TEXT NOT NULL,\n"
sql += "  option_b TEXT NOT NULL,\n"
sql += "  option_c TEXT NOT NULL,\n"
sql += "  option_d TEXT NOT NULL,\n"
sql += "  correct_answer CHAR(1) NOT NULL\n"
sql += ");\n\n"

sql += "CREATE TABLE IF NOT EXISTS test_results (\n"
sql += "  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n"
sql += "  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n"
sql += "  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,\n"
sql += "  score INTEGER DEFAULT 0,\n"
sql += "  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n"
sql += "  finished_at TIMESTAMP WITH TIME ZONE,\n"
sql += "  is_passed BOOLEAN DEFAULT FALSE\n"
sql += ");\n\n"

sql += "-- 2. Eskilarini tozalash (agar qayta yozilayotgan bo'lsa)\n"
sql += "TRUNCATE TABLE test_questions RESTART IDENTITY;\n\n"

sql += "-- 3. Savollarni kiritish\n"
sql += "INSERT INTO test_questions (text, option_a, option_b, option_c, option_d, correct_answer) VALUES\n"

values = []
for q in questions:
    text = q['text'].replace("'", "''")
    opt_a = q['options'].get('А', q['options'].get('A', '')).replace("'", "''")
    opt_b = q['options'].get('Б', q['options'].get('B', '')).replace("'", "''")
    opt_c = q['options'].get('С', q['options'].get('C', '')).replace("'", "''")
    opt_d = q['options'].get('Д', q['options'].get('D', '')).replace("'", "''")
    
    # Check fallback for Cyrillic letters mismatch
    if not opt_c:
         # Some strings might use latin C
         opt_c = q['options'].get('C', '').replace("'", "''")
         
    corr = q['correct_answer']
    if corr == 'А': corr = 'A'
    if corr == 'Б': corr = 'B'
    if corr == 'С': corr = 'C'
    if corr == 'Д': corr = 'D'
    
    values.append(f"('{text}', '{opt_a}', '{opt_b}', '{opt_c}', '{opt_d}', '{corr}')")

sql += ",\n".join(values) + ";\n"

with open('supabase/setup_test.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
