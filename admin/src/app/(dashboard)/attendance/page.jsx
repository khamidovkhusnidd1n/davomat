'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Edit2, Plus, X } from 'lucide-react';
import styles from './page.module.css';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editLateHours, setEditLateHours] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Yangi davomat uchun
  const [showNewModal, setShowNewModal] = useState(false);
  const [allGroups, setAllGroups] = useState([]);
  const [newAttDate, setNewAttDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
  const [newAttGroupId, setNewAttGroupId] = useState('');
  const [groupStudents, setGroupStudents] = useState([]);
  const [newAttData, setNewAttData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateRecord = async (id) => {
    try {
      let hours = 0;
      if (editStatus === 'late') {
        hours = parseInt(editLateHours, 10);
        if (isNaN(hours) || hours <= 0 || hours > 6) {
          alert("Kech qolgan soat 1 dan 6 gacha bo'lishi kerak!");
          return;
        }
      }
      
      const { error } = await supabase.from('attendance').update({ status: editStatus, late_hours: hours }).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      fetchAttendance();
    } catch (e) {
      alert("Xatolik yuz berdi: " + e.message);
    }
  };

  useEffect(() => {
    let initialDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('group')) setFilterGroup(params.get('group'));
      if (params.get('date')) initialDate = params.get('date');
    }
    setFilterDate(initialDate);
    fetchAttendance();
    fetchGroups();
  }, []);

  async function fetchGroups() {
    const { data } = await supabase.from('groups').select('id, name');
    if (data) setAllGroups(data);
  }

  async function fetchAttendance() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: userData } = await supabase.from('users').select('role, id').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          status,
          late_hours,
          created_at,
          students ( users ( full_name ) ),
          lessons ( lesson_date, title, groups ( name ) ),
          users!attendance_marked_by_fkey ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(500); 
      
      if (error) throw error;
      setAttendances(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  // Handle changing group for new attendance
  useEffect(() => {
    async function loadStudents() {
      if (!newAttGroupId) {
        setGroupStudents([]);
        setNewAttData({});
        return;
      }
      const { data: stds } = await supabase
        .from('students')
        .select('id, users(full_name)')
        .eq('group_id', newAttGroupId);
      
      if (stds) {
        setGroupStudents(stds);
        const initData = {};
        stds.forEach(s => {
          initData[s.id] = { status: 'present', late_hours: 0 };
        });
        setNewAttData(initData);
      }
    }
    loadStudents();
  }, [newAttGroupId]);

  const handleSaveNewAttendance = async () => {
    if (!newAttGroupId || !newAttDate) {
      return alert("Guruh va sanani tanlang!");
    }
    setIsSaving(true);
    try {
      // 1. Find or create lesson
      let lessonId;
      const { data: existingLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('group_id', newAttGroupId)
        .eq('lesson_date', newAttDate)
        .single();
      
      if (existingLesson) {
        lessonId = existingLesson.id;
      } else {
        const { data: newLesson, error: lErr } = await supabase
          .from('lessons')
          .insert({ group_id: newAttGroupId, lesson_date: newAttDate, title: 'Webdan kiritildi' })
          .select('id').single();
        if (lErr) throw lErr;
        lessonId = newLesson.id;
      }

      // 2. Upsert attendance
      const rows = groupStudents.map(s => {
        const att = newAttData[s.id];
        return {
          lesson_id: lessonId,
          student_id: s.id,
          status: att.status,
          late_hours: att.late_hours || 0,
          marked_by: currentUser?.id
        };
      });

      const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'lesson_id,student_id' });
      if (error) throw error;

      alert("Davomat saqlandi!");
      setShowNewModal(false);
      fetchAttendance();
    } catch (e) {
      alert("Xato: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueGroups = [...new Set(attendances.map(a => a.lessons?.groups?.name).filter(Boolean))];

  const filtered = attendances.filter(a => {
    const studentName = a.students?.users?.full_name?.toLowerCase() || '';
    const groupName = a.lessons?.groups?.name || '';
    const query = search.toLowerCase();
    
    const matchesSearch = studentName.includes(query) || groupName.toLowerCase().includes(query);
    const matchesGroup = filterGroup ? groupName === filterGroup : true;
    const matchesDate = filterDate ? a.lessons?.lesson_date === filterDate : true;

    return matchesSearch && matchesGroup && matchesDate;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Tinglovchi yoki guruh..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="input" 
          style={{ maxWidth: '200px' }}
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
        >
          <option value="">Barcha guruhlar</option>
          {uniqueGroups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="date"
            className="input"
            style={{ maxWidth: '160px' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              onClick={() => setFilterDate('')}
              title="Sanani tozalash"
            >
              Tozalash
            </button>
          )}
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)} style={{display:'flex', alignItems:'center', gap:'5px'}}>
          <Plus size={16}/> Web Davomat
        </button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        {loading ? (
          <div className={styles.loading}>Yuklanmoqda...</div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sana</th>
                  <th>Tinglovchi</th>
                  <th>Guruh</th>
                  <th>Dars Mavzusi</th>
                  <th>Status</th>
                  <th>Kech qolgan soat</th>
                  <th>Belgiladi</th>
                  {(userRole === 'sysadmin' || userRole === 'admin' || userRole === 'academic') && <th>Harakat</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filtered.map((record, index) => {
                    const dateObj = new Date(record.created_at);
                    return (
                      <tr key={record.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className={styles.dateBlock}>
                            <span className={styles.date}>{dateObj.toLocaleDateString('uz-UZ')}</span>
                            <span className={styles.time}>{dateObj.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{record.students?.users?.full_name || "Noma'lum"}</td>
                        <td>{record.lessons?.groups?.name || '-'}</td>
                        <td>{record.lessons?.title || 'Mavzusiz'}</td>
                        <td>
                          {editingId === record.id ? (
                            <select className="input" style={{ width: '130px', padding: '4px' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                              <option value="present">Kelgan</option>
                              <option value="absent">Kelmagan (Sababsiz)</option>
                              <option value="excused">Kelmagan (Sababli)</option>
                              <option value="late">Kech qolgan</option>
                            </select>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles[record.status] || ''}`}>
                              {record.status === 'present' ? 'Kelgan' : record.status === 'excused' ? 'Kelmagan (Sababli)' : record.status === 'absent' || record.status === 'unexcused' ? 'Kelmagan (Sababsiz)' : 'Kech qolgan'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingId === record.id && editStatus === 'late' ? (
                            <input type="number" min="1" max="6" style={{ width: '60px', padding: '4px' }} className="input" value={editLateHours} onChange={(e) => setEditLateHours(e.target.value)} />
                          ) : (
                            record.status === 'late' ? <span>{record.late_hours || 0} soat</span> : '-'
                          )}
                        </td>
                        <td className={styles.textSmall}>{record.users?.full_name || 'Tizim'}</td>
                        {(userRole === 'sysadmin' || userRole === 'admin' || userRole === 'academic') && (
                          <td>
                            {editingId === record.id ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => handleUpdateRecord(record.id)}>OK</button>
                                <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}>X</button>
                              </div>
                            ) : (
                              <button className={styles.actionBtn} onClick={() => { 
                                setEditingId(record.id); 
                                setEditStatus(record.status); 
                                setEditLateHours(record.late_hours?.toString() || '0'); 
                              }}>
                                <Edit2 size={16} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Davomat kiritish</h2>
              <button className={styles.closeBtn} onClick={() => setShowNewModal(false)}><X size={20}/></button>
            </div>
            
            <div className={styles.modalFormGroup}>
              <div className={styles.formField}>
                <label>Sana</label>
                <input type="date" className="input" value={newAttDate} onChange={e=>setNewAttDate(e.target.value)} />
              </div>
              <div className={styles.formField}>
                <label>Guruh</label>
                <select className="input" value={newAttGroupId} onChange={e=>setNewAttGroupId(e.target.value)}>
                  <option value="">-- Guruhni tanlang --</option>
                  {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {groupStudents.length > 0 && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  {groupStudents.map(s => {
                    const status = newAttData[s.id]?.status || 'present';
                    return (
                      <div key={s.id} className={styles.studentRow}>
                        <div className={styles.studentName}>{s.users?.full_name}</div>
                        <div className={styles.statusGroup}>
                          <button 
                            className={`${styles.statusBtn} ${status === 'present' ? styles.statusPresent : ''}`}
                            onClick={() => setNewAttData({...newAttData, [s.id]: { ...newAttData[s.id], status: 'present' }})}
                          >
                            Kelgan
                          </button>
                          <button 
                            className={`${styles.statusBtn} ${status === 'absent' ? styles.statusAbsent : ''}`}
                            onClick={() => setNewAttData({...newAttData, [s.id]: { ...newAttData[s.id], status: 'absent' }})}
                          >
                            Kelmagan
                          </button>
                          <button 
                            className={`${styles.statusBtn} ${status === 'excused' ? styles.statusExcused : ''}`}
                            onClick={() => setNewAttData({...newAttData, [s.id]: { ...newAttData[s.id], status: 'excused' }})}
                          >
                            Sababli
                          </button>
                          <button 
                            className={`${styles.statusBtn} ${status === 'late' ? styles.statusLate : ''}`}
                            onClick={() => setNewAttData({...newAttData, [s.id]: { ...newAttData[s.id], status: 'late' }})}
                          >
                            Kech qoldi
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className={`btn btn-primary ${styles.saveBtn}`} onClick={handleSaveNewAttendance} disabled={isSaving}>
                  {isSaving ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
                </button>
              </div>
            )}
            {!newAttGroupId && <p style={{color:'var(--text-muted)', textAlign:'center', padding:'20px 0'}}>Guruhni tanlang, shunda o'quvchilar ro'yxati chiqadi.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
