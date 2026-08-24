import docx
import json

doc_path = r"C:\Users\Salohiddin Markaz\Downloads\60_ta_test_3_fan_KRILL_JAVOBLARI_BILAN.docx"
output_path = r"C:\Users\Salohiddin Markaz\Desktop\davomat\test_questions_parsed.txt"

try:
    doc = docx.Document(doc_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            f.write(text + "\n")
except Exception as e:
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"Error: {e}\n")
