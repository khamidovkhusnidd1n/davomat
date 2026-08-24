'use client';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader, Download } from 'lucide-react';
import styles from './ExcelHistoricalImport.module.css';

export default function ExcelHistoricalImport({ isOpen, onClose, onSuccess }) {
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
      alert("Faqat .xlsx, .xls, .csv fayl qabul qilinadi");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/teachers/import-historical', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          historicalData: parsedData
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
            <h2>Eski soatlarni yuklash (Baza)</h2>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
        </div>

        {step === 1 && (
          <div>
            <a href="/Eski_darslar_shabloni.xlsx" download className={styles.templateLink}>
              <Download size={18} />
              Avval Shablonni Yuklab Oling
            </a>

            <div 
              className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className={styles.uploadIcon} />
              <p>Faylni bu yerga tashlang yoki tanlang</p>
              <span>.xlsx, .xls, .csv</span>
              <input 
                type="file" 
                ref={fileRef}
                className={styles.fileInput}
                accept=".xlsx, .xls, .csv"
                onChange={(e) => parseFile(e.target.files[0])}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
              <strong>{fileName}</strong> tayyor. <br/>
              Jami <strong>{parsedData.length}</strong> ta qator topildi.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={reset}
                disabled={importing}
              >
                Bekor qilish
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={importing}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {importing ? <Loader className="spin" size={18} /> : <CheckCircle size={18} />}
                {importing ? 'Yuklanmoqda...' : 'Boshlash'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className={styles.result}>
            {result.success?.length > 0 ? (
              <CheckCircle size={48} className={styles.successIcon} />
            ) : (
              <AlertCircle size={48} className={styles.successIcon} style={{ color: '#ef4444' }} />
            )}
            
            <h3>Natija</h3>
            <p>{result.message}</p>

            <div className={styles.details}>
              <div className={styles.success}>
                ✅ Muvaffaqiyatli: {result.success?.length || 0} ta yozuv
              </div>
              <div className={styles.errors}>
                ❌ Xatoliklar: {result.errors?.length || 0} ta
              </div>
              
              {result.errors?.length > 0 && (
                <ul className={styles.errorList}>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e.teacher} - {e.reason}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... va yana {result.errors.length - 5} ta xatolik</li>
                  )}
                </ul>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ marginTop: '20px', width: '100%' }}
              onClick={handleClose}
            >
              Yopish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
