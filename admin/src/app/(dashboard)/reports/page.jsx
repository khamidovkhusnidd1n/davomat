'use client';
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BarChart3, AlertTriangle, FileSpreadsheet, Download, FileText } from 'lucide-react';
import styles from './page.module.css';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({ groups: [], students: [], lessons: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?month=${selectedMonth}`);
      if (!res.ok) throw new Error('API xatosi');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      alert('Ma\'lumotlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }

  // --- HISOBLASHLAR (CALCULATIONS) ---

  // 1. Guruhlar reytingi
  const groupStats = useMemo(() => {
    const stats = data.groups.map(g => {
      // Find all lessons for this group
      const gLessons = data.lessons.filter(l => l.group_id === g.id);
      const lessonIds = gLessons.map(l => l.id);
      
      // Find all attendance for these lessons
      const gAtt = data.attendance.filter(a => lessonIds.includes(a.lesson_id));
      
      const total = gAtt.length;
      const present = gAtt.filter(a => a.status === 'present').length;
      const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

      return {
        ...g,
        totalLessons: gLessons.length,
        totalChecks: total,
        percentage
      };
    });

    return stats.sort((a, b) => b.percentage - a.percentage);
  }, [data]);

  // 2. Qizil zona (>= 3 marta ketma-ket kelmaganlar)
  const redZoneStudents = useMemo(() => {
    const alerts = [];
    
    // Group lessons by group_id and sort by date descending
    const lessonsByGroup = {};
    data.lessons.forEach(l => {
      if (!lessonsByGroup[l.group_id]) lessonsByGroup[l.group_id] = [];
      lessonsByGroup[l.group_id].push(l);
    });
    
    for (const gid in lessonsByGroup) {
      lessonsByGroup[gid].sort((a, b) => new Date(b.lesson_date) - new Date(a.lesson_date));
    }

    data.students.forEach(st => {
      const groupLessons = lessonsByGroup[st.group_id] || [];
      // Take last 5 lessons to check
      const recentLessons = groupLessons.slice(0, 5);
      
      let consecutiveAbsent = 0;
      for (const les of recentLessons) {
        const att = data.attendance.find(a => a.lesson_id === les.id && a.student_id === st.id);
        if (att && att.status === 'absent') {
          consecutiveAbsent++;
        } else if (att) {
          // Came or excused, break streak
          break; 
        }
      }

      if (consecutiveAbsent >= 3) {
        const group = data.groups.find(g => g.id === st.group_id);
        alerts.push({
          student: st,
          groupName: group?.name || 'Noma\'lum',
          absentCount: consecutiveAbsent
        });
      }
    });

    return alerts.sort((a, b) => b.absentCount - a.absentCount);
  }, [data]);

  // --- EXPORT FUNKSIYALARI ---
  
  const generateExportData = () => {
    // We want a matrix for each group.
    // SheetName = Group Name
    // Columns: O'quvchi F.I.O, Dates...
    
    const sheetsData = {};

    data.groups.forEach(g => {
      const gLessons = data.lessons.filter(l => l.group_id === g.id).sort((a, b) => new Date(a.lesson_date) - new Date(b.lesson_date));
      const gStudents = data.students.filter(s => s.group_id === g.id);
      
      if (gStudents.length === 0 || gLessons.length === 0) return;

      const dates = gLessons.map(l => l.lesson_date);
      
      const rows = gStudents.map(st => {
        const row = { 'O\'quvchi F.I.O': st.users?.full_name || 'Ismsiz' };
        
        gLessons.forEach(les => {
          const att = data.attendance.find(a => a.lesson_id === les.id && a.student_id === st.id);
          let mark = '';
          if (att) {
            if (att.status === 'present') mark = '+';
            else if (att.status === 'absent') mark = '-';
            else if (att.status === 'late') mark = 'K';
            else if (att.status === 'excused') mark = 'S';
          }
          row[les.lesson_date] = mark;
        });
        
        return row;
      });

      sheetsData[g.name] = rows;
    });

    return sheetsData;
  };

  const exportExcel = () => {
    const sheetsData = generateExportData();
    if (Object.keys(sheetsData).length === 0) {
      alert('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }

    const wb = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(sheetsData)) {
      // Create valid sheet name (max 31 chars)
      const validName = sheetName.substring(0, 31).replace(/[\\/?*\[\]]/g, '');
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, validName || 'Sheet');
    }

    XLSX.writeFile(wb, `Davomat_Hisoboti_${selectedMonth}.xlsx`);
  };

  const exportPDF = () => {
    const sheetsData = generateExportData();
    if (Object.keys(sheetsData).length === 0) {
      alert('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text(`Davomat Hisoboti: ${selectedMonth}`, 14, 15);
    
    let yPos = 25;

    for (const [groupName, rows] of Object.entries(sheetsData)) {
      if (rows.length === 0) continue;
      
      doc.setFontSize(14);
      doc.text(`Guruh: ${groupName}`, 14, yPos);
      yPos += 5;

      const columns = Object.keys(rows[0]).map(k => ({ header: k, dataKey: k }));
      
      doc.autoTable({
        startY: yPos,
        columns: columns,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      });

      yPos = doc.lastAutoTable.finalY + 15;
      
      // Add new page if close to bottom
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
    }

    doc.save(`Davomat_Hisoboti_${selectedMonth}.pdf`);
  };

  // --- RENDER ---

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Hisobotlar va Analitika</h1>
        <p>O'quv markazi bo'yicha davomat natijalari va statistikalar</p>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} /> Guruhlar Reytingi
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'redzone' ? styles.active : ''}`}
          onClick={() => setActiveTab('redzone')}
        >
          <AlertTriangle size={18} /> Qizil Zona
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'export' ? styles.active : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <FileSpreadsheet size={18} /> Eksport
        </button>
      </div>

      <div className={styles.content}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: '500' }}>Hisobot oyi:</label>
          <input 
            type="month" 
            className="input" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles.loading}>Hisoblanmoqda...</div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>O'rin</th>
                      <th>Guruh Nomi</th>
                      <th>Davomat Foizi</th>
                      <th>O'tilgan Darslar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.length === 0 ? (
                      <tr><td colSpan={4}>Ma'lumot yo'q</td></tr>
                    ) : (
                      groupStats.map((g, index) => (
                        <tr key={g.id}>
                          <td>
                            <span className={`${styles.rankBadge} ${index === 0 ? styles.rank1 : index === 1 ? styles.rank2 : index === 2 ? styles.rank3 : styles.rankOther}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{g.name}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${g.percentage}%`, background: g.percentage >= 80 ? 'var(--success)' : g.percentage >= 50 ? '#f59e0b' : 'var(--danger)' }} />
                              </div>
                              <span style={{ width: 40, fontWeight: '500' }}>{g.percentage}%</span>
                            </div>
                          </td>
                          <td>{g.totalLessons} ta dars</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* RED ZONE TAB */}
            {activeTab === 'redzone' && (
              <div className={styles.tableWrapper}>
                <div style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
                  * Quyidagi o'quvchilar oxirgi darslarda <strong>ketma-ket 3 va undan ortiq marta</strong> qatnashmagan. Ota-onalari bilan bog'lanish tavsiya etiladi.
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>O'quvchi Ismi</th>
                      <th>Guruh</th>
                      <th>Holati</th>
                      <th>Ota-ona raqami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redZoneStudents.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--success)', padding: 32 }}>Tabriklaymiz! Qizil zonada o'quvchilar yo'q 🎉</td></tr>
                    ) : (
                      redZoneStudents.map((item, idx) => (
                        <tr key={idx} className={styles.redRow}>
                          <td style={{ fontWeight: '600' }}>{item.student.users?.full_name || 'Ismsiz'}</td>
                          <td>{item.groupName}</td>
                          <td>
                            <span className={styles.dangerBadge}>
                              Ketma-ket {item.absentCount} marta kelmadi
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            {item.student.users?.phone || 'Kiritilmagan'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* EXPORT TAB */}
            {activeTab === 'export' && (
              <div className={styles.exportPanel}>
                <h3>{selectedMonth} oyi uchun barcha guruhlar hisobotini yuklab olish</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Excel faylida har bir guruh alohida varaq (sheet) bo'lib tushadi.</p>
                
                <div className={styles.exportButtons}>
                  <button className={`${styles.exportBtn} ${styles.btnExcel}`} onClick={exportExcel}>
                    <FileSpreadsheet size={24} /> Excel Yuklash (.xlsx)
                  </button>
                  
                  <button className={`${styles.exportBtn} ${styles.btnPdf}`} onClick={exportPDF}>
                    <FileText size={24} /> PDF Yuklash (.pdf)
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
