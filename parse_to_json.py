import json
import re

input_file = r"C:\Users\Salohiddin Markaz\Desktop\davomat\test_questions_parsed.txt"
output_file = r"C:\Users\Salohiddin Markaz\Desktop\davomat\questions.json"

questions = []
current_question = None

with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if not line:
        continue
        
    # Check if it's a new question (starts with number and dot)
    match = re.match(r'^(\d+)\.\s+(.*)', line)
    if match:
        if current_question and 'text' in current_question:
            questions.append(current_question)
        current_question = {
            'id': int(match.group(1)),
            'text': match.group(2),
            'options': {},
            'correct_answer': None
        }
        continue
        
    # Check if it's an option
    opt_match = re.match(r'^([АБВГДСABCDE])[\)\.]\s+(.*)', line, re.IGNORECASE)
    if opt_match and current_question:
        letter = opt_match.group(1).upper()
        # Normalize C and D if they got mixed with Latin/Cyrillic
        # Cyrillic А=А, Б=Б, В=В, Г=Г, Д=Д, С=С. Latin A=A, B=B, C=C, D=D
        current_question['options'][letter] = opt_match.group(2)
        continue
        
    # Check if it's correct answer
    ans_match = re.match(r'^Тўғри жавоб:\s*([АБВГДСABCDE])', line, re.IGNORECASE)
    if ans_match and current_question:
        letter = ans_match.group(1).upper()
        current_question['correct_answer'] = letter
        continue

if current_question and 'text' in current_question:
    questions.append(current_question)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"Parsed {len(questions)} questions.")
