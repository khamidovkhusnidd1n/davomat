'use client';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import styles from './ExcelLessonsImport.module.css';

export default function ExcelLessonsImport({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
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
      const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      
      if (rows.length === 0) {
        alert("Fayl bo'sh yoki noto'g'ri formatda.");
        return;
      }

      setParsedData(rows);
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
      const res = await fetch('/api/lessons/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonsData: parsedData
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
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <FileSpreadsheet size={22} className={styles.titleIcon} />
            <h2>Aniq Sanali Darslarni Import Qilish</h2>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>

        <div className={styles.steps}>
          {['Fayl yuklash', 'Ko\'rib chiqish', 'Natija'].map((label, i) => (
            <div key={i} className={`${styles.step} ${step === i + 1 ? styles.active : ''} ${step > i + 1 ? styles.done : ''}`}>
              <div className={styles.stepNum}>{step > i + 1 ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.body}>
          {step === 1 && (
            <div className={styles.uploadSection}>
              <div
                className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={40} className={styles.uploadIcon} />
                <p className={styles.dropText}>Kengaytirilgan jadvalni (Sana, O'qituvchi bilan) shu yerga tashlang</p>
                <p className={styles.dropHint}>.xlsx, .xls, .csv qabul qilinadi</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => parseFile(e.target.files[0])}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.previewSection}>
              <div className={styles.previewMeta}>
                <span className={styles.fileChip}><FileSpreadsheet size={14} />{fileName}</span>
                <span className={styles.countChip}>{parsedData.length} ta dars topildi</span>
                <button className={styles.changeFile} onClick={() => { reset(); }}>Faylni almashtirish</button>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Guruh</th>
                      <th>Sana</th>
                      <th>Mavzu</th>
                      <th>O'qituvchi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{row.Guruh || row.guruh || '-'}</td>
                        <td>{row.Sana || row.sana || '-'}</td>
                        <td>{row.Mavzu || row.mavzu || '-'}</td>
                        <td>{row.Oqituvchi || row.oqituvchi || '-'}</td>
                      </tr>
                    ))}
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
                  : `${parsedData.length} ta darsni bazaga saqlash`
                }
              </button>
            </div>
          )}

          {step === 3 && result && (
            <div className={styles.resultSection}>
              <div className={styles.resultSummary}>
                {result.error ? (
                  <div className={styles.resultCard} data-type="failed" style={{ flex: '1 1 100%' }}>
                    <AlertCircle size={32} />
                    <span style={{ fontSize: '1rem', color: 'var(--danger)' }}>{result.error}</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.resultCard} data-type="success">
                      <CheckCircle size={32} />
                      <span>{result.success?.length || 0} ta muvaffaqiyatli</span>
                    </div>
                    <div className={styles.resultCard} data-type="failed">
                      <AlertCircle size={32} />
                      <span>{result.failed?.length || 0} ta xatolik</span>
                    </div>
                  </>
                )}
              </div>

              {result.failed?.length > 0 && (
                <div className={styles.failedList}>
                  <h4>Qo'shilmaganlar:</h4>
                  {result.failed.map((f, i) => (
                    <div key={i} className={styles.failedItem}>
                      <span>{f.row?.Guruh || 'Noma\'lum'} ({f.row?.Sana})</span>
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
