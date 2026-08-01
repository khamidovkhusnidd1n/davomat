'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, Eye, Plus, X, Edit, Trash } from 'lucide-react';
import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import ExcelLessonsImport from '@/components/ExcelLessonsImport/ExcelLessonsImport';
import Modal from '@/components/Modal/Modal';
import styles from './page.module.css';

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [schedules, setSchedules] = useState([]);

  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);

  const [formData, setFormData] = useState({
    group_id: '',
    lesson_date: new Date().toISOString().split('T')[0],
    title: '',
    start_time: '09:00',
    end_time: '13:00',
    subject_id: '',
    teacher_id: '',
    custom_subject_name: '',
    lesson_type: 'practice'
  });
  const [editFormData, setEditFormData] = useState({
    id: '',
    group_id: '',
    lesson_date: '',
    title: '',
    start_time: '09:00',
    end_time: '13:00',
    subject_id: '',
    teacher_id: '',
    custom_subject_name: '',
    lesson_type: 'practice'
  });

  useEffect(() => {
    fetchLessons();
    fetchGroups();
    fetchSchedules();
    fetchSubjects();
    fetchTeachers();
    fetchTeacherSubjects();
  }, []);

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    if (data) setSubjects(data);
  }

  async function fetchTeachers() {
    const { data } = await supabase
      .from('teachers')
      .select(`
        id, 
        full_name, 
        education_type,
        max_hours,
        teacher_subjects(completed_hours)
      `)
      .order('full_name');
    if (data) {
      const todayStr = new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0];
      const teachersWithStats = await Promise.all(data.map(async (t) => {
        const { data: lesData } = await supabase
          .from('lessons')
          .select('lesson_date, start_time, end_time')
          .eq('teacher_id', t.id);
        
        const manualCompleted = t.teacher_subjects?.reduce((sum, ts) => sum + (ts.completed_hours || 0), 0) || 0;

        const futureLessons = (lesData || []).filter(l => l.lesson_date >= todayStr);
        const dynamicHours = futureLessons.reduce((sum, l) => {
          const start = l.start_time || '09:00';
          const end = l.end_time || '13:00';
          const [startH, startM] = start.substring(0, 5).split(':').map(Number);
          const [endH, endM] = end.substring(0, 5).split(':').map(Number);
          const diffHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
          const hours = diffHours > 0 ? Math.round(diffHours * 1.5) : 6;
          return sum + hours;
        }, 0);

        const completedHours = manualCompleted + dynamicHours;
        
        return {
          ...t,
          completed_hours: completedHours,
          limit_reached: completedHours >= (t.max_hours || 120)
        };
      }));
      setTeachers(teachersWithStats);
    }
  }

  async function fetchTeacherSubjects() {
    const { data } = await supabase.from('teacher_subjects').select('teacher_id, subject_id');
    if (data) setTeacherSubjects(data);
  }

  async function fetchSchedules() {
    const { data } = await supabase
      .from('schedules')
      .select('id, group_id, day_of_week, start_time, end_time')
      .order('day_of_week')
      .order('start_time');
    if (data) setSchedules(data);
  }

  async function fetchGroups() {
    const { data } = await supabase.from('groups').select('id, name, education_type').order('name');
    if (data) setGroups(data);
  }

  async function fetchLessons(silent = false) {
    try {
      if (!silent) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          lesson_date,
          group_id,
          schedule_id,
          teacher_id,
          subject_id,
          lesson_type,
          groups ( name, course_name, education_type ),
          users!lessons_created_by_fkey ( full_name ),
          teachers ( full_name ),
          subjects ( name ),
          attendance ( status )
        `)
        .order('lesson_date', { ascending: false });
      
      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  }
  const isWriteEnabled = userRole === 'sysadmin' || userRole === 'admin' || userRole === 'academic';

  const filteredLessons = lessons.filter(l => {
    const matchesSearch = 
      l.title?.toLowerCase().includes(search.toLowerCase()) || 
      l.groups?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.subjects?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.teachers?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || l.group_id === selectedGroup;
    return matchesSearch && matchesGroup;
  });
  const parseLessonTitle = (rawTitle, scheduleId, schedulesList) => {
    let startTime = '09:00';
    let endTime = '13:00';
    let cleanTitle = rawTitle || '';

    const timePrefixMatch = cleanTitle.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*\|\s*(.*)$/);
    if (timePrefixMatch) {
      startTime = timePrefixMatch[1];
      endTime = timePrefixMatch[2];
      cleanTitle = timePrefixMatch[3];
    } else if (scheduleId) {
      const sch = schedulesList.find(s => s.id === scheduleId);
      if (sch) {
        startTime = sch.start_time.substring(0, 5);
        endTime = sch.end_time.substring(0, 5);
      }
    }
    return { startTime, endTime, cleanTitle };
  };

  async function handleSaveLesson(e) {
    e.preventDefault();
    if (!formData.group_id || !formData.lesson_date || !formData.start_time || !formData.end_time) return;
    


    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/lessons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Saqlashda xatolik yuz berdi');

      setShowModal(false);
      setFormData({
        group_id: '',
        lesson_date: new Date().toISOString().split('T')[0],
        title: '',
        start_time: '09:00',
        end_time: '13:00',
        subject_id: '',
        teacher_id: '',
        custom_subject_name: '',
        lesson_type: 'practice'
      });
      fetchLessons(true);
      fetchSchedules();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleEditClick = (lesson) => {
    const { startTime, endTime, cleanTitle } = parseLessonTitle(lesson.title, lesson.schedule_id, schedules);
    const assigned = lesson.teacher_id 
      ? teacherSubjects.filter(ts => ts.teacher_id === lesson.teacher_id).map(ts => ts.subject_id)
      : [];
    const isAssigned = assigned.includes(lesson.subject_id);

    setEditFormData({
      id: lesson.id,
      group_id: lesson.group_id || '',
      lesson_date: lesson.lesson_date || '',
      title: cleanTitle,
      start_time: startTime,
      end_time: endTime,
      subject_id: (lesson.subject_id && isAssigned) ? lesson.subject_id : (lesson.subject_id ? 'custom_subject' : ''),
      teacher_id: lesson.teacher_id || '',
      custom_subject_name: (!isAssigned && lesson.subject_id) ? (subjects.find(s => s.id === lesson.subject_id)?.name || '') : '',
      lesson_type: lesson.lesson_type || 'practice'
    });
    setShowEditModal(true);
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    if (!editFormData.group_id || !editFormData.lesson_date || !editFormData.start_time || !editFormData.end_time) return;


    try {
      setEditing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/lessons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Saqlashda xatolik yuz berdi');

      setShowEditModal(false);
      fetchLessons(true);
      fetchSchedules();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi: ' + err.message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!confirm("Haqiqatan ham ushbu darsni o'chirmoqchimisiz? Darsga tegishli barcha davomatlar ham butunlay o'chib ketadi!")) return;
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchLessons(true);
    } catch (err) {
      console.error(err);
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  // Filter logic for teachers
  const selectedFormGroup = groups.find(g => g.id === formData.group_id);
  const groupEduType = selectedFormGroup?.education_type;
  
  const displayTeachers = groupEduType
    ? teachers.filter(t => t.education_type === groupEduType)
    : teachers;

  const selectedEditGroup = groups.find(g => g.id === editFormData.group_id);
  const editGroupEduType = selectedEditGroup?.education_type;
  
  const displayEditTeachers = editGroupEduType
    ? teachers.filter(t => t.education_type === editGroupEduType)
    : teachers;

  const addAssignedSubs = formData.teacher_id
    ? teacherSubjects
        .filter(ts => ts.teacher_id === formData.teacher_id)
        .map(ts => subjects.find(s => s.id === ts.subject_id))
        .filter(Boolean)
    : [];

  const addHasAssignedSubs = addAssignedSubs.length > 0;

  const editAssignedSubs = editFormData.teacher_id
    ? teacherSubjects
        .filter(ts => ts.teacher_id === editFormData.teacher_id)
        .map(ts => subjects.find(s => s.id === ts.subject_id))
        .filter(Boolean)
    : [];

  const editHasAssignedSubs = editAssignedSubs.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Darslar jadvali</h1>

      
        <div className={styles.controls}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Dars mavzusi yoki guruh..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: '200px' }}
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="all">Barcha guruhlar</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        {isWriteEnabled && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{backgroundColor: '#e0e7ff', color: '#4f46e5'}} onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={18} /> Excel Import
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} />
              <span>Dars qo'shish</span>
            </button>
          </div>
        )}
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
                  <th>Guruh</th>
                  <th>Mavzu</th>
                  <th>Yaratuvchi</th>
                  <th>Davomat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredLessons.map((lesson, index) => {
                    const present = lesson.attendance.filter(a => a.status === 'present').length;
                    const total = lesson.attendance.length;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    
                    return (
                      <tr key={lesson.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className={styles.dateWrapper}>
                            <Calendar size={14} className={styles.dateIcon} />
                            {new Date(lesson.lesson_date).toLocaleDateString('uz-UZ')}
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{lesson.groups?.name || 'Noma\'lum'}</td>
                        <td>
                          <div className={styles.subjectTopicWrapper}>
                            {lesson.subjects?.name && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span className={styles.subjectBadge}>
                                  {lesson.subjects.name}
                                </span>
                                <span style={{ 
                                  fontSize: '0.68rem', 
                                  padding: '1px 5px', 
                                  borderRadius: '3px', 
                                  background: lesson.lesson_type === 'theory' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                                  color: lesson.lesson_type === 'theory' ? '#3b82f6' : '#10b981',
                                  fontWeight: '600'
                                }}>
                                  {lesson.lesson_type === 'theory' ? 'Nazariy' : 'Amaliy'}
                                </span>
                              </div>
                            )}
                            <div className={styles.topicText}>
                              {lesson.title || 'Mavzusiz'}
                            </div>
                            {lesson.teachers?.full_name && (
                              <span className={styles.teacherText}>
                                O'qituvchi: {lesson.teachers.full_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{lesson.users?.full_name || 'Tizim'}</td>
                        <td>
                          {total > 0 ? (
                            <div className={styles.progressWrapper}>
                              <div className={styles.progressBar}>
                                <div 
                                  className={styles.progressFill} 
                                  style={{ width: `${rate}%`, background: rate > 80 ? 'var(--success)' : rate > 50 ? 'var(--warning)' : 'var(--error)' }}
                                ></div>
                              </div>
                              <span className={styles.progressText}>{rate}% ({present}/{total})</span>
                            </div>
                          ) : (
                            <span className={styles.textMuted}>Kiritilmagan</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionsContainer}>
                            <Link href={`/attendance?group=${encodeURIComponent(lesson.groups?.name || '')}&date=${lesson.lesson_date}`}>
                              <button className={styles.actionBtn} title="Ko'rish">
                                <Eye size={18} />
                              </button>
                            </Link>
                            {isWriteEnabled && (
                              <button className={styles.actionBtn} onClick={() => handleEditClick(lesson)} title="Tahrirlash">
                                <Edit size={18} />
                              </button>
                            )}
                            {(userRole === 'sysadmin' || userRole === 'admin') && (
                              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteLesson(lesson.id)} title="O'chirish">
                                <Trash size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Yangi dars qo'shish"
      >
        <form onSubmit={handleSaveLesson}>
          <div className="form-group">
            <label>Guruh</label>
            <select 
              className="input" 
              value={formData.group_id}
              onChange={(e) => setFormData({...formData, group_id: e.target.value, schedule_id: ''})}
              required
            >
              <option value="">Guruhni tanlang</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Dars boshlanishi</label>
              <input 
                type="time" 
                className="input" 
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Dars tugashi</label>
              <input 
                type="time" 
                className="input" 
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Sana</label>
              <input 
                type="date" 
                className="input" 
                value={formData.lesson_date}
                onChange={(e) => setFormData({...formData, lesson_date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Dars turi</label>
              <select
                className="input"
                value={formData.lesson_type}
                onChange={(e) => setFormData({...formData, lesson_type: e.target.value})}
                required
              >
                <option value="practice">Amaliy (Practice)</option>
                <option value="theory">Nazariy (Theory)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>O'qituvchi</label>
            <select 
              className="input" 
              value={formData.teacher_id}
              onChange={(e) => {
                const tId = e.target.value;
                const assigned = teacherSubjects
                  .filter(ts => ts.teacher_id === tId)
                  .map(ts => subjects.find(s => s.id === ts.subject_id))
                  .filter(Boolean);
                
                setFormData({
                  ...formData,
                  teacher_id: tId,
                  subject_id: assigned.length > 0 ? '' : 'custom_subject',
                  custom_subject_name: ''
                });
              }}
              required
            >
              <option value="">O'qituvchini tanlang</option>
              {displayTeachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.full_name} {t.limit_reached ? `(Limit to'lgan: ${t.completed_hours}/${t.max_hours} s)` : `(${t.completed_hours}/${t.max_hours} s)`}
                </option>
              ))}
            </select>
          </div>

          {formData.teacher_id && (
            <div className="form-group">
              <label>Fan</label>
              {addHasAssignedSubs ? (
                <>
                  <select 
                    className="input" 
                    value={formData.subject_id}
                    onChange={(e) => setFormData({
                      ...formData, 
                      subject_id: e.target.value,
                      custom_subject_name: e.target.value === 'custom_subject' ? formData.custom_subject_name : ''
                    })}
                    required
                  >
                    <option value="">Fanni tanlang</option>
                    {addAssignedSubs.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="custom_subject">+ Yangi fan yozish</option>
                  </select>
                  
                  {formData.subject_id === 'custom_subject' && (
                    <input 
                      type="text"
                      className="input"
                      style={{ marginTop: '0.5rem' }}
                      placeholder="Fan nomini kiriting..."
                      value={formData.custom_subject_name}
                      onChange={(e) => setFormData({...formData, custom_subject_name: e.target.value})}
                      required
                    />
                  )}
                </>
              ) : (
                <input 
                  type="text"
                  className="input"
                  placeholder="Fan nomini kiriting..."
                  value={formData.custom_subject_name}
                  onChange={(e) => setFormData({
                    ...formData, 
                    subject_id: 'custom_subject', 
                    custom_subject_name: e.target.value
                  })}
                  required
                />
              )}
            </div>
          )}

          <div className="form-group">
            <label>Mavzu</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Mavzuni kiriting..."
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Darsni tahrirlash"
      >
        <form onSubmit={handleUpdateLesson}>
          <div className="form-group">
            <label>Guruh</label>
            <select 
              className="input" 
              value={editFormData.group_id}
              onChange={(e) => setEditFormData({...editFormData, group_id: e.target.value, schedule_id: ''})}
              required
            >
              <option value="">Guruhni tanlang</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Dars boshlanishi</label>
              <input 
                type="time" 
                className="input" 
                value={editFormData.start_time}
                onChange={(e) => setEditFormData({...editFormData, start_time: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Dars tugashi</label>
              <input 
                type="time" 
                className="input" 
                value={editFormData.end_time}
                onChange={(e) => setEditFormData({...editFormData, end_time: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Sana</label>
              <input 
                type="date" 
                className="input" 
                value={editFormData.lesson_date}
                onChange={(e) => setEditFormData({...editFormData, lesson_date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Dars turi</label>
              <select
                className="input"
                value={editFormData.lesson_type}
                onChange={(e) => setEditFormData({...editFormData, lesson_type: e.target.value})}
                required
              >
                <option value="practice">Amaliy (Practice)</option>
                <option value="theory">Nazariy (Theory)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>O'qituvchi</label>
            <select 
              className="input" 
              value={editFormData.teacher_id}
              onChange={(e) => {
                const tId = e.target.value;
                const assigned = teacherSubjects
                  .filter(ts => ts.teacher_id === tId)
                  .map(ts => subjects.find(s => s.id === ts.subject_id))
                  .filter(Boolean);
                
                setEditFormData({
                  ...editFormData,
                  teacher_id: tId,
                  subject_id: assigned.length > 0 ? '' : 'custom_subject',
                  custom_subject_name: ''
                });
              }}
              required
            >
              <option value="">O'qituvchini tanlang</option>
              {displayEditTeachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.full_name} {t.limit_reached ? `(Limit to'lgan: ${t.completed_hours}/${t.max_hours} s)` : `(${t.completed_hours}/${t.max_hours} s)`}
                </option>
              ))}
            </select>
          </div>

          {editFormData.teacher_id && (
            <div className="form-group">
              <label>Fan</label>
              {editHasAssignedSubs ? (
                <>
                  <select 
                    className="input" 
                    value={editFormData.subject_id}
                    onChange={(e) => setEditFormData({
                      ...editFormData, 
                      subject_id: e.target.value,
                      custom_subject_name: e.target.value === 'custom_subject' ? editFormData.custom_subject_name : ''
                    })}
                    required
                  >
                    <option value="">Fanni tanlang</option>
                    {editAssignedSubs.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="custom_subject">+ Yangi fan yozish</option>
                  </select>
                  
                  {editFormData.subject_id === 'custom_subject' && (
                    <input 
                      type="text"
                      className="input"
                      style={{ marginTop: '0.5rem' }}
                      placeholder="Fan nomini kiriting..."
                      value={editFormData.custom_subject_name}
                      onChange={(e) => setEditFormData({...editFormData, custom_subject_name: e.target.value})}
                      required
                    />
                  )}
                </>
              ) : (
                <input 
                  type="text"
                  className="input"
                  placeholder="Fan nomini kiriting..."
                  value={editFormData.custom_subject_name}
                  onChange={(e) => setEditFormData({
                    ...editFormData, 
                    subject_id: 'custom_subject', 
                    custom_subject_name: e.target.value
                  })}
                  required
                />
              )}
            </div>
          )}

          <div className="form-group">
            <label>Mavzu</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Mavzuni kiriting..."
              value={editFormData.title}
              onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={editing}>
              {editing ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <ExcelLessonsImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => fetchLessons(true)}
      />
    </div>
  );
}
