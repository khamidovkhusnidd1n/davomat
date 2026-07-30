'use client';
import { useState } from 'react';
import Modal from '@/components/Modal/Modal';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export default function TeacherImportModal({ isOpen, onClose, onSuccess, academicYear }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'done'
  const [results, setResults] = useState({ success: 0, failed: 0 });

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
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

        setPreview(parsed);
        setStep('preview');
      } catch (e) {
        setError('Faylni o\'qishda xatolik: ' + e.message);
      }
    };
    reader.readAsBinaryString(f);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={downloadTemplate} style={{ alignSelf: 'flex-start' }}>
            📥 Shablon yuklab olish
          </button>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Shablon ustunlari: <strong>To'liq ism, Telefon, Ta'lim shakli, Fan 1, Fan 1 soat, Fan 2, Fan 2 soat</strong>
          </p>
          <div className="form-group">
            <label>Excel fayl tanlang</label>
            <input
              type="file"
              className="input"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
        </div>
      )}

      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            <strong>{preview.length}</strong> ta o'qituvchi topildi. O'quv yili: <strong>{academicYear}</strong>
          </p>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>#</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Ism</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Ta'lim turi</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Fan 1</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Fan 2</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '5px 8px' }}>{i + 1}</td>
                    <td style={{ padding: '5px 8px', fontWeight: '600' }}>{row.full_name}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: '10px', fontSize: '0.75rem',
                        background: row.education_type === 'malaka_oshirish' ? '#dbeafe' : '#dcfce7',
                        color: row.education_type === 'malaka_oshirish' ? '#1d4ed8' : '#15803d'
                      }}>
                        {row.education_type === 'malaka_oshirish' ? 'Malaka' : 'Qayta'}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px' }}>{row.subject1 ? `${row.subject1} (${row.subject1_hours}s)` : '—'}</td>
                    <td style={{ padding: '5px 8px' }}>{row.subject2 ? `${row.subject2} (${row.subject2_hours}s)` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>Yuklash yakunlandi!</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Muvaffaqiyatli: <strong style={{ color: '#22c55e' }}>{results.success}</strong> ta
            {results.failed > 0 && <>, Xatolik: <strong style={{ color: '#ef4444' }}>{results.failed}</strong> ta</>}
          </p>
        </div>
      )}
    </Modal>
  );
}
