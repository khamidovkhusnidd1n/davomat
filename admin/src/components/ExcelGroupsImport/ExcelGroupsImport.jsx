'use client';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react';
import styles from '../ExcelImport/ExcelImport.module.css';

export default function ExcelGroupsImport({ isOpen, onClose, organizationId, onSuccess }) {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=result
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const reset = () => {
    setStep(1);
    setParsedData([]);
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
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      
      const normalized = json.map(row => {
        const obj = {};
        for (const [k, v] of Object.entries(row)) {
          const cleanKey = k.toLowerCase().trim().replace(/\s+/g, '_');
          obj[cleanKey] = String(v).trim();
        }
        return obj;
      }).filter(row => row.guruh_nomi || row.guruh);

      if (normalized.length === 0) {
        alert('Fayl ichidan guruh ma\'lumotlari topilmadi.\nIltimos, shablonni yuklab olib, to\'ldirib ko\'ring.');
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
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/groups/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          rows: parsedData,
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <FileSpreadsheet size={22} className={styles.titleIcon} />
            <h2>Excel orqali Guruhlar va Talabalar Importi</h2>
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
              <a href="/Guruhlar_Shabloni.xlsx" download="Guruhlar_Shabloni.xlsx" className={styles.templateBtn} style={{ display: 'inline-flex', textDecoration: 'none', alignItems: 'center' }}>
                <Download size={16} style={{ marginRight: 8 }} /> Shablon (.xlsx) yuklab olish
              </a>

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
                  <li><code>Guruh Nomi</code> — Guruhning nomi (masalan, Matematika-1)</li>
                  <li><code>Fan Nomi</code> — Guruh o'tadigan fanning nomi (masalan, Matematika)</li>
                  <li><code>Talaba F.I.Sh</code> — Tinglovchining ismi familiyasi (ixtiyoriy, bo'sh bo'lsa faqat guruh yaratiladi)</li>
                  <li><code>Telefon raqami</code> — Tinglovchining telefon raqami (ixtiyoriy)</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2 — Preview */}
          {step === 2 && (
            <div className={styles.previewSection}>
              <div className={styles.previewMeta}>
                <span className={styles.fileChip}><FileSpreadsheet size={14} />{fileName}</span>
                <span className={styles.countChip}>{parsedData.length} ta qator topildi</span>
                <button className={styles.changeFile} onClick={() => { reset(); }}>Faylni almashtirish</button>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Guruh Nomi</th>
                      <th>Fan Nomi</th>
                      <th>Talaba F.I.Sh</th>
                      <th>Telefon raqami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, i) => {
                      const groupName = row['guruh_nomi'] || row['guruh'];
                      const courseName = row['fan_nomi'] || row['fan'];
                      const studentName = row['talaba_f.i.sh'] || row['talaba_fish'] || row['o\'quvchi'] || row['oquvchi'] || row['ism'];
                      const phone = row['telefon_raqami'] || row['telefon'] || row['phone'];

                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{groupName || <span className={styles.missing}>—</span>}</td>
                          <td>{courseName || <span className={styles.missing}>—</span>}</td>
                          <td>{studentName || <span className={styles.missing}>— (Faqat guruh)</span>}</td>
                          <td>{phone || <span className={styles.missing}>—</span>}</td>
                        </tr>
                      );
                    })}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={5} className={styles.moreRows}>... yana {parsedData.length - 10} ta qator</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={handleImport}
                disabled={importing}
              >
                {importing
                  ? <><Loader size={16} className={styles.spin} /> Import qilinmoqda...</>
                  : `${parsedData.length} ta yozuvni import qilish`
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
                  {result.failed.map((f, i) => {
                    const groupName = f.row?.['Guruh Nomi'] || f.row?.['guruh_nomi'] || f.row?.['Guruh'] || f.row?.['guruh'] || 'Noma\'lum';
                    const studentName = f.row?.['Talaba F.I.Sh'] || f.row?.['talaba_fish'] || f.row?.['O\'quvchi'] || f.row?.['o\'quvchi'] || f.row?.['Ism'] || f.row?.['ism'] || '';
                    return (
                      <div key={i} className={styles.failedItem}>
                        <span>{groupName} {studentName ? `- ${studentName}` : ''}</span>
                        <span className={styles.failReason}>{f.reason}</span>
                      </div>
                    );
                  })}
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
