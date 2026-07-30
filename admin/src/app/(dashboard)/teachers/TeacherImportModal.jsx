'use client';
import { useState } from 'react';
import Modal from '@/components/Modal/Modal';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { UploadCloud, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import styles from './TeacherImportModal.module.css';

export default function TeacherImportModal({ isOpen, onClose, onSuccess, academicYear }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'done'
  const [results, setResults] = useState({ success: 0, failed: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  function parseExcelFile(f) {
    setFile(f);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const parsed = rows.map((row, idx) => ({
          rowNum: idx + 2,
          full_name: String(row["To'liq ism"] || row["Ism"] || row["full_name"] || '').trim(),
          phone: String(row["Telefon"] || row["phone"] || '').trim(),
          education_type: String(row["Ta'lim shakli"] || row["education_type"] || '').trim().toLowerCase()
            .replace("malaka oshirish", "malaka_oshirish")
            .replace("qayta tayyorlov", "qayta_tayyorlov")
            .replace("qayta tayyorlov", "qayta_tayyorlov") || 'qayta_tayyorlov',
          subject1: String(row["Fan 1"] || row["fan1"] || '').trim(),
          subject1_hours: parseInt(row["Fan 1 soat"] || row["soat1"] || 0),
          subject2: String(row["Fan 2"] || row["fan2"] || '').trim(),
          subject2_hours: parseInt(row["Fan 2 soat"] || row["soat2"] || 0),
          subject3: String(row["Fan 3"] || row["fan3"] || '').trim(),
          subject3_hours: parseInt(row["Fan 3 soat"] || row["soat3"] || 0),
        })).filter(r => r.full_name);

        if (parsed.length === 0) {
          throw new Error("Excel faylda yaroqli o'qituvchi ma'lumotlari topilmadi. Ustun nomlarini tekshiring.");
        }

        setPreview(parsed);
        setStep('preview');
      } catch (e) {
        setError(e.message);
        setFile(null);
      }
    };
    reader.onerror = () => {
      setError('Faylni yuklashda xatolik yuz berdi');
      setFile(null);
    };
    reader.readAsBinaryString(f);
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) parseExcelFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseExcelFile(f);
  }

  async function handleImport() {
    setLoading(true);
    setError('');
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
      const orgId = userData?.organization_id;
      if (!orgId) throw new Error('Tashkilot topilmadi');

      for (const row of preview) {
        try {
          // 1. Create teacher
          const { data: teacher, error: tErr } = await supabase
            .from('teachers')
            .upsert({
              organization_id: orgId,
              full_name: row.full_name,
              phone: row.phone || null,
              education_type: row.education_type,
            }, { onConflict: 'organization_id,full_name' })
            .select('id')
            .single();
          
          if (tErr) throw tErr;

          // 2. Process subjects
          const subjects = [
            { name: row.subject1, hours: row.subject1_hours },
            { name: row.subject2, hours: row.subject2_hours },
            { name: row.subject3, hours: row.subject3_hours },
          ].filter(s => s.name);

          for (const subj of subjects) {
            // Create or find subject
            const { data: subject, error: sErr } = await supabase
              .from('subjects')
              .upsert({ organization_id: orgId, name: subj.name }, { onConflict: 'organization_id,name' })
              .select('id')
              .single();
            
            if (sErr) throw sErr;

            // Link teacher to subject with hours
            await supabase
              .from('teacher_subjects')
              .upsert({
                teacher_id: teacher.id,
                subject_id: subject.id,
                allocated_hours: subj.hours,
                academic_year: academicYear,
              }, { onConflict: 'teacher_id,subject_id,academic_year' });
          }

          successCount++;
        } catch (rowErr) {
          console.error(`Row ${row.rowNum} error:`, rowErr);
          failCount++;
        }
      }

      setResults({ success: successCount, failed: failCount });
      setStep('done');
      if (successCount > 0) onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setPreview([]);
    setStep('upload');
    setError('');
    setResults({ success: 0, failed: 0 });
    onClose();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["To'liq ism", "Telefon", "Ta'lim shakli", "Fan 1", "Fan 1 soat", "Fan 2", "Fan 2 soat", "Fan 3", "Fan 3 soat"],
      ["Karimov Jasur", "+998901234567", "malaka_oshirish", "Rangtasvir", 120, "Pedagogika", 80, "", 0],
      ["Umarova Dilnoza", "+998991234567", "qayta_tayyorlov", "Matematika", 150, "", 0, "", 0],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "O'qituvchilar");
    XLSX.writeFile(wb, "oqituvchilar_shablon.xlsx");
  }

  const footer = step === 'upload' ? (
    <>
      <button className="btn btn-secondary" onClick={handleClose}>Bekor qilish</button>
    </>
  ) : step === 'preview' ? (
    <>
      <button className="btn btn-secondary" onClick={() => setStep('upload')}>Orqaga</button>
      <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
        {loading ? 'Yuklanmoqda...' : `${preview.length} ta o'qituvchi yuklash`}
      </button>
    </>
  ) : (
    <button className="btn btn-primary" onClick={handleClose}>Yopish</button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="O'qituvchilarni Excel'dan yuklash"
      footer={footer}
    >
      {step === 'upload' && (
        <div className={styles.uploadSection}>
          <button className={styles.templateBtn} onClick={downloadTemplate}>
            <Download size={18} /> Shablon yuklab olish
          </button>
          
          <div 
            className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadCloud size={48} className={styles.uploadIcon} />
            <span className={styles.dropText}>Excel faylni bu yerga tashlang yoki bosing</span>
            <span className={styles.dropHint}>Faqat .xlsx, .xls fayllar</span>
            <input
              type="file"
              className={styles.fileInput}
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>

          <div className={styles.colGuide}>
            <p>Shablon talab qilinadigan ustunlari:</p>
            <ul>
              <li><code>To'liq ism</code> — o'qituvchi ism-sharifi</li>
              <li><code>Telefon</code> — aloqa raqami</li>
              <li><code>Ta'lim shakli</code> — <code>malaka_oshirish</code> yoki <code>qayta_tayyorlov</code></li>
              <li><code>Fan 1</code>, <code>Fan 1 soat</code>, <code>Fan 2</code>, <code>Fan 2 soat</code></li>
            </ul>
          </div>
          
          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#ef4444' }}>
              <AlertCircle size={16} />
              <p className={styles.errorText}>{error}</p>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className={styles.previewSection}>
          <div className={styles.previewMeta}>
            <span className={styles.countChip}>{preview.length} ta o'qituvchi topildi</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>O'quv yili: <strong>{academicYear}</strong></span>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ism</th>
                  <th>Ta'lim turi</th>
                  <th>Fan 1</th>
                  <th>Fan 2</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{row.full_name}</td>
                    <td>
                      <span className={`${styles.badge} ${row.education_type === 'malaka_oshirish' ? styles.badgeMalaka : styles.badgeQayta}`}>
                        {row.education_type === 'malaka_oshirish' ? 'Malaka' : 'Qayta'}
                      </span>
                    </td>
                    <td>{row.subject1 ? `${row.subject1} (${row.subject1_hours}s)` : '—'}</td>
                    <td>{row.subject2 ? `${row.subject2} (${row.subject2_hours}s)` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      )}

      {step === 'done' && (
        <div className={styles.doneSection}>
          <div className={styles.successIcon}>✅</div>
          <h4 className={styles.doneTitle}>Muvaffaqiyatli yuklandi!</h4>
          <p className={styles.doneText}>
            Yangi o'qituvchilar va ularning dars soatlari tizimga qo'shildi.
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Muvaffaqiyatli: <strong style={{ color: '#22c55e' }}>{results.success}</strong> ta
            {results.failed > 0 && <>, Xatolik: <strong style={{ color: '#ef4444' }}>{results.failed}</strong> ta</>}
          </div>
        </div>
      )}
    </Modal>
  );
}
