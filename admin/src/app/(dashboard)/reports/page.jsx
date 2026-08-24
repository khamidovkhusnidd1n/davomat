'use client';
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BarChart3, AlertTriangle, FileSpreadsheet, Download, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import TeacherAnalyticsTab from './TeacherAnalyticsTab';
import styles from './page.module.css';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'teachers'
  const [data, setData] = useState({ groups: [], students: [], lessons: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [currentUserFullName, setCurrentUserFullName] = useState('');
  
  const [filterType, setFilterType] = useState('month'); // 'month' or 'date'
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [selectedExportGroup, setSelectedExportGroup] = useState('all');

  useEffect(() => {
    fetchData();
  }, [filterType, selectedMonth, selectedDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: uData } = await supabase.from('users').select('full_name').eq('id', user.id).single();
        if (uData) setCurrentUserFullName(uData.full_name);
      }

      // Fetch groups
      const { data: groups, error: gErr } = await supabase
        .from('groups')
        .select('id, name, course_name, education_type, status');
      if (gErr) throw gErr;

      // Fetch students
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select(`
          id, 
          group_id, 
          users ( full_name, phone )
        `);
      if (sErr) throw sErr;

      // Fetch lessons
      let lessonsQuery = supabase.from('lessons').select('id, group_id, lesson_date, title').order('lesson_date', { ascending: true });
      if (filterType === 'month' && selectedMonth) {
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`; 
        lessonsQuery = lessonsQuery.gte('lesson_date', startDate).lte('lesson_date', endDate);
      } else if (filterType === 'date' && selectedDate) {
        lessonsQuery = lessonsQuery.eq('lesson_date', selectedDate);
      }
      const { data: lessons, error: lErr } = await lessonsQuery;
      if (lErr) throw lErr;

      const lessonIds = lessons ? lessons.map(l => l.id) : [];
      let attendance = [];
      
      if (lessonIds.length > 0) {
        const { data: attData, error: aErr } = await supabase
          .from('attendance')
          .select('id, lesson_id, student_id, status, late_hours')
          .in('lesson_id', lessonIds);
        if (aErr) throw aErr;
        attendance = attData || [];
      }

      setData({
        groups: groups || [],
        students: students || [],
        lessons: lessons || [],
        attendance: attendance
      });
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
    return data.groups.map(g => {
      const groupLessons = data.lessons.filter(l => l.group_id === g.id);
      const lessonIds = groupLessons.map(l => l.id);
      const gAtt = data.attendance.filter(a => lessonIds.includes(a.lesson_id));
      
      const total = gAtt.length;
      const present = gAtt.filter(a => a.status === 'present').length;

      // Adjust group name if archived
      if (g.status === 'archived') {
        g.name = `${g.name} (Arxivlangan)`;
      }

      return {
        ...g,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        totalLessons: groupLessons.length
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
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
      
      let totalUnexcusedHours = 0;
      for (const les of groupLessons) {
        const att = data.attendance.find(a => a.lesson_id === les.id && a.student_id === st.id);
        if (att) {
          if (att.status === 'absent' || att.status === 'unexcused') {
            totalUnexcusedHours += 6;
          } else if (att.status === 'late' && att.late_hours > 0) {
            totalUnexcusedHours += att.late_hours;
          }
        }
      }

      // Qayta tayyorlash kursi uchun 36 soat (6 marta dars) limit
      if (totalUnexcusedHours >= 36) {
        const group = data.groups.find(g => g.id === st.group_id);
        alerts.push({
          student: st,
          groupName: group?.name || 'Noma\'lum',
          absentCount: totalUnexcusedHours
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

    let groupsToExport = data.groups;
    if (selectedExportGroup !== 'all') {
      groupsToExport = data.groups.filter(g => g.id === selectedExportGroup);
    }

    groupsToExport.forEach(g => {
      const gLessons = data.lessons.filter(l => l.group_id === g.id).sort((a, b) => new Date(a.lesson_date) - new Date(b.lesson_date));
      const gStudents = data.students.filter(s => s.group_id === g.id);
      
      if (gStudents.length === 0 || gLessons.length === 0) return;
      
      const rows = gStudents.map(st => {
        const row = { 'O\'quvchi F.I.O': st.users?.full_name || 'Ismsiz' };
        let missedHours = 0;
                gLessons.forEach(les => {
            const att = data.attendance.find(a => a.lesson_id === les.id && a.student_id === st.id);
            let mark = '';
            if (att) {
              if (att.status === 'present') {
                mark = '+';
              } else if (att.status === 'absent' || att.status === 'unexcused') {
                mark = '-';
                missedHours += 6;
              } else if (att.status === 'late') {
                mark = 'Kech keldi';
                if (att.late_hours > 0) missedHours += att.late_hours;
              } else if (att.status === 'excused') {
                mark = 'Sababli';
              }
            }
            // Use short date: DD.MM to save space (e.g. 20.07 instead of 2026-07-20)
            const [yyyy, mm, dd] = les.lesson_date.split('-');
            const shortDate = `${dd}.${mm}`;
            row[shortDate] = mark;
          });
          
          row['Qoldiq (s)'] = missedHours > 0 ? `${missedHours}` : '0';
          
          return row;
      });

      sheetsData[g.name] = rows;
    });

    return sheetsData;
  };

  const exportExcel = async () => {
    const sheetsData = generateExportData();
    if (Object.keys(sheetsData).length === 0) {
      alert('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Markaz Davomat Tizimi';
    workbook.created = new Date();

    const exportLabel = filterType === 'month' ? selectedMonth : filterType === 'date' ? selectedDate : 'Umumiy';

    for (const [groupName, rows] of Object.entries(sheetsData)) {
      if (rows.length === 0) continue;
      const validName = groupName.substring(0, 31).replace(/[\\/?*[\]]/g, '');
      const sheet = workbook.addWorksheet(validName || 'Sheet');

      // Add Title
      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `Guruh: ${groupName} - Davomat Hisoboti (${exportLabel})`;
      titleCell.font = { name: 'Arial', size: 16, bold: true };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.addRow([]); // empty row

      // Headers
      const keys = Object.keys(rows[0]);
      const headerRow = sheet.addRow(keys);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo color
        };
      });

      // Data Rows
      rows.forEach(r => {
        const rowData = keys.map(k => r[k]);
        const excelRow = sheet.addRow(rowData);
        
        // Formatting cells based on attendance marks
        excelRow.eachCell((cell, colNumber) => {
          if (colNumber > 1) { // Skip name column
            cell.alignment = { horizontal: 'center' };
            if (cell.value === '+') {
              cell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Green
            } else if (cell.value === '-') {
              cell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            } else if (cell.value === 'Kech keldi' || cell.value === 'Sababli') {
              cell.font = { color: { argb: 'FFD97706' }, bold: true }; // Yellow/Orange
            }
          }
        });
      });

      // Column widths
      sheet.getColumn(1).width = 30; // F.I.Sh
      const totalCols = Object.keys(rows[0]).length;
      for (let i = 2; i < totalCols; i++) {
        sheet.getColumn(i).width = 12; // Dates
      }
      sheet.getColumn(totalCols).width = 18; // Qoldirilgan (soat)

      // Freeze panes
      sheet.views = [
        { state: 'frozen', xSplit: 1, ySplit: 3 }
      ];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Davomat_Hisoboti_${exportLabel}.xlsx`);
  };

  const exportPDF = () => {
    const sheetsData = generateExportData();
    if (Object.keys(sheetsData).length === 0) {
      alert('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }

    const doc = new jsPDF('landscape');
    
    const exportLabel = filterType === 'month' ? selectedMonth : filterType === 'date' ? selectedDate : 'Umumiy';

    // Add branding header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('MALAKA OSHIRISH MARKAZI', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(`Davomat Hisoboti: ${exportLabel}`, 14, 28);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 280, 32);

    let yPos = 40;

    for (const [groupName, rows] of Object.entries(sheetsData)) {
      if (rows.length === 0) continue;
      
      doc.setFontSize(16);
      doc.setTextColor(79, 70, 229);
      doc.text(`Guruh: ${groupName}`, 14, yPos);
      yPos += 5;

      const columns = Object.keys(rows[0]).map(k => ({ header: k, dataKey: k }));
      
      autoTable(doc, {
        startY: yPos,
        columns: columns,
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          "O'quvchi F.I.O": { cellWidth: 40 },
          "Qoldiq (s)": { cellWidth: 15 }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 0) {
             if (data.cell.raw === '+') {
                 data.cell.styles.textColor = [22, 163, 74];
                 data.cell.styles.fontStyle = 'bold';
             } else if (data.cell.raw === '-') {
                 data.cell.styles.textColor = [220, 38, 38];
                 data.cell.styles.fontStyle = 'bold';
                 data.cell.styles.fillColor = [254, 226, 226];
             } else if (data.cell.raw === 'Kech keldi' || data.cell.raw === 'Sababli') {
                 data.cell.styles.textColor = [217, 119, 6];
             }
          }
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
      
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    // Add signature area at the end
    if (yPos > 160) { doc.addPage(); yPos = 30; }
    doc.setFontSize(12);
    doc.setTextColor(0,0,0);
    doc.text(`Mas'ul xodim: ${currentUserFullName || '_________________________'}`, 14, yPos + 10);
    doc.text('Sana: ' + new Date().toLocaleDateString('uz-UZ'), 14, yPos + 20);

    doc.save(`Davomat_Hisoboti_${exportLabel}.pdf`);
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
            className={`${styles.tabBtn} ${activeTab === 'teachers' ? styles.active : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            <FileSpreadsheet size={18} /> O'qituvchilar Tahlili
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
          {activeTab !== 'teachers' && (
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <select 
                className="input" 
                style={{ width: '160px' }}
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="month">Oylik hisobot</option>
                <option value="date">Kunlik hisobot</option>
                <option value="all">Umumiy</option>
              </select>

              {filterType === 'month' ? (
                <input 
                  type="month" 
                  className="input"
                  style={{ width: '160px' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              ) : filterType === 'date' ? (
                <input
                  type="date"
                  className="input"
                  style={{ width: '160px' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              ) : null}

              {activeTab === 'export' && (
                <select
                  className="input"
                  style={{ width: '220px', marginLeft: 'auto' }}
                  value={selectedExportGroup}
                  onChange={(e) => setSelectedExportGroup(e.target.value)}
                >
                  <option value="all">Barcha guruhlar</option>
                  {data.groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {loading ? (
            <div className={styles.loading}>Hisoblanmoqda...</div>
          ) : (
            <>
              {activeTab === 'teachers' && (
                <TeacherAnalyticsTab />
              )}
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
                  * Quyidagi tinglovchilar <strong>uzrli sababsiz 36 soat (6 ta modul) va undan ortiq</strong> qatnashmagan. Qayta tayyorlash kursi nizomiga muvofiq, ular tinglovchilar safidan chetlashtirishga tavsiya etiladi.
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tinglovchi Ismi</th>
                      <th>Guruh</th>
                      <th>Qoldirilgan soat</th>
                      <th>Ota-ona raqami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redZoneStudents.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--success)', padding: 32 }}>Tabriklaymiz! Chetlashtirish xavfi ostida bo'lgan tinglovchilar yo'q 🎉</td></tr>
                    ) : (
                      redZoneStudents.map((item, idx) => (
                        <tr key={idx} className={styles.redRow}>
                          <td style={{ fontWeight: '600' }}>{item.student.users?.full_name || 'Ismsiz'}</td>
                          <td>{item.groupName}</td>
                          <td>
                            <div className={styles.alertBadge}>
                              <AlertTriangle size={14} />
                              <span className={styles.alertCount}>{item.absentCount} soat</span>
                            </div>
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
                <h3>{filterType === 'month' ? selectedMonth : filterType === 'date' ? selectedDate : 'Umumiy barcha vaqt'} uchun {selectedExportGroup === 'all' ? 'barcha guruhlar' : 'tanlangan guruh'} hisobotini yuklab olish</h3>
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
