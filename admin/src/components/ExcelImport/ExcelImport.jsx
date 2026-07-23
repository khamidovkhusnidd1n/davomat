'use client';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react';
import styles from './ExcelImport.module.css';

// Shablon ustun nomlari (birinchi qator)
const REQUIRED_COLS = ['full_name'];
const COL_LABELS = {
  full_name: 'F.I.Sh (majburiy)',
  phone: 'Telefon',
  email: 'Email',
};

export default function ExcelImport({ isOpen, onClose, groups, organizationId, onSuccess }) {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=result
  const [parsedData, setParsedData] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const reset = () => {
    setStep(1);
    setParsedData([]);
    setSelectedGroup('');
    setImporting(false);
    setResult(null);
    setFileName('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseFile = useCallback((file) => {
    if (!file) return;
    const allowed = ['xlsx', 'xls', 'csv'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      alert('Faqat .xlsx, .xls, .csv fayl qabul qilinadi');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // 1-usul: Standard parser
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      let normalized = json.map(row => {
        const obj = {};
        for (const [k, v] of Object.entries(row)) {
          const cleanKey = k.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          obj[cleanKey] = String(v).trim();
        }
        return obj;
      }).filter(row => row.full_name); // bo'sh ismlarni o'chir

      // 2-usul: Smart Parser (Agar shablon bo'lmasa, shunchaki ismlar ro'yxati bo'lsa)
      if (normalized.length === 0) {
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
        const smartResult = [];
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          
          // Agar birinchi ustun matn bo'lsa va ismga o'xshasa (kamida 3 ta harf)
          const firstCol = String(row[0] || '').trim();
          if (firstCol.length > 3 && isNaN(Number(firstCol))) {
            smartResult.push({
              full_name: firstCol,
              phone: String(row[1] || '').trim(),
              email: String(row[2] || '').trim(),
            });
          }
        }
        normalized = smartResult;
      }

      if (normalized.length === 0) {
        alert('Fayl ichidan bironta ham o\'quvchi ismi topilmadi.\nIltimos, shablonni ko\'chirib olib, ustunlarni to\'g\'rilab ko\'ring.');
        return;
      }

      setParsedData(normalized);
      setStep(2);
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    parseFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!selectedGroup) {
      alert('Guruh tanlang');
      return;
    }

    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          students: parsedData,
          groupId: selectedGroup,
          organizationId,
        }),
      });

      const data = await res.json();
      setResult(data);
      setStep(3);
      if (data.success?.length > 0) onSuccess?.();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['full_name', 'phone', 'email'],
      ['Ali Valiyev', '+998901234567', 'ali@example.com'],
      ['Gulnora Karimova', '+998901234568', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'O\'quvchilar');
    XLSX.writeFile(wb, 'davomad_oquvchilar_shablon.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <FileSpreadsheet size={22} className={styles.titleIcon} />
            <h2>Excel orqali O'quvchilar Import</h2>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>

        {/* Steps */}
        <div className={styles.steps}>
          {['Fayl yuklash', 'Ko\'rib chiqish', 'Natija'].map((label, i) => (
            <div key={i} className={`${styles.step} ${step === i + 1 ? styles.active : ''} ${step > i + 1 ? styles.done : ''}`}>
              <div className={styles.stepNum}>{step > i + 1 ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.body}>
          {/* STEP 1 — Upload */}
          {step === 1 && (
            <div className={styles.uploadSection}>
              <button className={styles.templateBtn} onClick={downloadTemplate}>
                <Download size={16} /> Shablon (.xlsx) yuklab olish
              </button>

              <div
                className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={40} className={styles.uploadIcon} />
                <p className={styles.dropText}>Faylni shu yerga tashlang yoki bosing</p>
                <p className={styles.dropHint}>.xlsx, .xls, .csv qabul qilinadi</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => parseFile(e.target.files[0])}
                />
              </div>

              <div className={styles.colGuide}>
                <p>Fayl ustunlari:</p>
                <ul>
                  {Object.entries(COL_LABELS).map(([k, v]) => (
                    <li key={k}><code>{k}</code> — {v}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2 — Preview */}
          {step === 2 && (
            <div className={styles.previewSection}>
              <div className={styles.previewMeta}>
                <span className={styles.fileChip}><FileSpreadsheet size={14} />{fileName}</span>
                <span className={styles.countChip}>{parsedData.length} ta o'quvchi topildi</span>
                <button className={styles.changeFile} onClick={() => { reset(); }}>Faylni almashtirish</button>
              </div>

              <div className={styles.groupSelect}>
                <label>Guruh tanlang *</label>
                <select
                  className="input"
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                >
                  <option value="">— Guruh tanlang —</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.course_name})</option>
                  ))}
                </select>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>F.I.Sh</th>
                      <th>Telefon</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{row.full_name || <span className={styles.missing}>—</span>}</td>
                        <td>{row.phone || <span className={styles.missing}>—</span>}</td>
                        <td>{row.email || <span className={styles.missing}>—</span>}</td>
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={4} className={styles.moreRows}>... yana {parsedData.length - 10} ta qator</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleImport}
                disabled={importing || !selectedGroup}
              >
                {importing
                  ? <><Loader size={16} className={styles.spin} /> Import qilinmoqda...</>
                  : `${parsedData.length} ta o'quvchi import qilish`
                }
              </button>
            </div>
          )}

          {/* STEP 3 — Result */}
          {step === 3 && result && (
            <div className={styles.resultSection}>
              <div className={styles.resultSummary}>
                <div className={styles.resultCard} data-type="success">
                  <CheckCircle size={32} />
                  <span>{result.success?.length || 0} ta muvaffaqiyatli</span>
                </div>
                <div className={styles.resultCard} data-type="failed">
                  <AlertCircle size={32} />
                  <span>{result.failed?.length || 0} ta xatolik</span>
                </div>
              </div>

              {result.failed?.length > 0 && (
                <div className={styles.failedList}>
                  <h4>Qo'shilmaganlar:</h4>
                  {result.failed.map((f, i) => (
                    <div key={i} className={styles.failedItem}>
                      <span>{f.full_name}</span>
                      <span className={styles.failReason}>{f.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.resultActions}>
                <button className="btn btn-secondary" onClick={reset}>Yana import qilish</button>
                <button className="btn btn-primary" onClick={handleClose}>Yopish</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
