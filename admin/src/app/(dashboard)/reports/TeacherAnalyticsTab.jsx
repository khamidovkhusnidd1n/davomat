'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './page.module.css';

export default function TeacherAnalyticsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [uniqueSubjects, setUniqueSubjects] = useState([]);
  const [uniqueGroups, setUniqueGroups] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      // Fetch all teachers with base hours
      const { data: teachers, error: tErr } = await supabase
        .from('teachers')
        .select(`
          id, full_name,
          teacher_subjects (
            subject_id,
            completed_theory_hours,
            completed_practice_hours,
            subjects ( name )
          )
        `);
      if (tErr) throw tErr;

      // Fetch all lessons that have passed (start_time + 1 hour < now)
      const now = new Date(new Date().getTime() + 5 * 60 * 60 * 1000); // UZ time
      const { data: lessons, error: lErr } = await supabase
        .from('lessons')
        .select(`
          id, teacher_id, subject_id, group_id, lesson_date, start_time, end_time,
          subjects ( name ),
          groups ( name )
        `);
      if (lErr) throw lErr;

      const passedLessons = lessons.filter(l => {
        const start = l.start_time || '09:00';
        const lessonStart = new Date(`${l.lesson_date}T${start.substring(0, 5)}:00+05:00`);
        lessonStart.setHours(lessonStart.getHours() + 1);
        return lessonStart < now;
      });

      // Build the hierarchical data: Teacher -> Subject -> Group -> Hours
      const analyticsMap = {};
      const subSet = new Set();
      const grpSet = new Set();

      teachers.forEach(t => {
        analyticsMap[t.id] = {
          teacherId: t.id,
          teacherName: t.full_name,
          subjects: {},
          totalHours: 0
        };
        
        // Add manual base hours first
        t.teacher_subjects?.forEach(ts => {
          if (!ts.subject_id) return;
          const subName = ts.subjects?.name || 'Noma\'lum fan';
          subSet.add(subName);
          
          const baseHours = (ts.completed_theory_hours || 0) + (ts.completed_practice_hours || 0);
          if (baseHours > 0) {
            if (!analyticsMap[t.id].subjects[ts.subject_id]) {
              analyticsMap[t.id].subjects[ts.subject_id] = {
                subjectName: subName,
                groups: {},
                subjectTotal: 0
              };
            }
            // Put it in a fake group called 'Guruhsiz (Eski qoldiq)'
            analyticsMap[t.id].subjects[ts.subject_id].groups['base'] = {
              groupName: 'Guruhsiz (Eski qoldiq)',
              hours: baseHours
            };
            analyticsMap[t.id].subjects[ts.subject_id].subjectTotal += baseHours;
            analyticsMap[t.id].totalHours += baseHours;
          }
        });
      });

      // Process real lessons
      passedLessons.forEach(l => {
        if (!l.teacher_id || !l.subject_id) return;
        
        const tId = l.teacher_id;
        const sId = l.subject_id;
        const gId = l.group_id || 'unknown';
        const subName = l.subjects?.name || 'Noma\'lum fan';
        const grpName = l.groups?.name || 'Noma\'lum guruh';
        
        subSet.add(subName);
        grpSet.add(grpName);

        if (!analyticsMap[tId]) return; // Or create a generic one

        if (!analyticsMap[tId].subjects[sId]) {
          analyticsMap[tId].subjects[sId] = {
            subjectName: subName,
            groups: {},
            subjectTotal: 0
          };
        }

        if (!analyticsMap[tId].subjects[sId].groups[gId]) {
          analyticsMap[tId].subjects[sId].groups[gId] = {
            groupName: grpName,
            hours: 0
          };
        }

        let lessonHours = 2; 
        if (l.start_time && l.end_time) {
          const [sh, sm] = l.start_time.split(':').map(Number);
          const [eh, em] = l.end_time.split(':').map(Number);
          if (!isNaN(sh) && !isNaN(eh)) {
            const diffHours = (eh + em/60) - (sh + sm/60);
            if (diffHours > 0 && diffHours < 12) {
              lessonHours = Math.round(diffHours); 
            }
          }
        }

        analyticsMap[tId].subjects[sId].groups[gId].hours += lessonHours;
        analyticsMap[tId].subjects[sId].subjectTotal += lessonHours;
        analyticsMap[tId].totalHours += lessonHours;
      });

      // Flatten into array and filter out 0 hour teachers
      const flatData = Object.values(analyticsMap)
        .filter(t => t.totalHours > 0)
        .sort((a, b) => b.totalHours - a.totalHours);

      setUniqueSubjects(Array.from(subSet).sort());
      setUniqueGroups(Array.from(grpSet).sort());
      setData(flatData);

    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  const exportToExcel = () => {
    const exportData = [];
    filteredData.forEach(t => {
      Object.values(t.subjects).forEach(sub => {
        Object.values(sub.groups).forEach(grp => {
          exportData.push({
            "O'qituvchi F.I.Sh": t.teacherName,
            "Fan": sub.subjectName,
            "Guruh": grp.groupName,
            "O'tilgan soat": grp.hours
          });
        });
      });
      // Add a total row for the teacher
      exportData.push({
        "O'qituvchi F.I.Sh": t.teacherName + ' (JAMI)',
        "Fan": '',
        "Guruh": '',
        "O'tilgan soat": t.totalHours
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "O'qituvchilar Tahlili");
    
    // Auto fit
    const max_len = [30, 25, 20, 15];
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, "Oqituvchilar_Jami_Tahlil.xlsx");
  };

  const filteredData = useMemo(() => {
    return data.filter(t => {
      const matchSearch = t.teacherName.toLowerCase().includes(search.toLowerCase());
      
      let matchSub = filterSubject === 'all';
      let matchGrp = filterGroup === 'all';

      if (!matchSub || !matchGrp) {
        let hasSub = false;
        let hasGrp = false;
        Object.values(t.subjects).forEach(sub => {
          if (sub.subjectName === filterSubject) hasSub = true;
          Object.values(sub.groups).forEach(grp => {
            if (grp.groupName === filterGroup) hasGrp = true;
          });
        });
        if (filterSubject !== 'all' && !hasSub) return false;
        if (filterGroup !== 'all' && !hasGrp) return false;
      }

      return matchSearch;
    });
  }, [data, search, filterSubject, filterGroup]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Yuklanmoqda...</div>;

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className="input"
            placeholder="O'qituvchi izlash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="all">Barcha fanlar</option>
          {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="all">Barcha guruhlar</option>
          {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} /> Excelga yuklash
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>O'qituvchi F.I.Sh</th>
              <th>Fan nomi</th>
              <th>Guruh nomi</th>
              <th style={{ textAlign: 'center' }}>O'tilgan soat</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(t => {
              const subs = Object.values(t.subjects);
              const rows = [];
              subs.forEach(sub => {
                const grps = Object.values(sub.groups);
                grps.forEach(grp => {
                  rows.push({
                    subName: sub.subjectName,
                    grpName: grp.groupName,
                    hours: grp.hours
                  });
                });
              });

              return (
                <tr key={t.teacherId}>
                  <td style={{ fontWeight: 'bold' }}>
                    {t.teacherName}
                    <br/>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Jami soat: {t.totalHours}</span>
                  </td>
                  <td colSpan={3} style={{ padding: 0, border: 'none' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid #eee' }}>
                            <td style={{ width: '40%', padding: '12px' }}>{r.subName}</td>
                            <td style={{ width: '35%', padding: '12px' }}>{r.grpName}</td>
                            <td style={{ width: '25%', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{r.hours} soat</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  Ma'lumot topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
