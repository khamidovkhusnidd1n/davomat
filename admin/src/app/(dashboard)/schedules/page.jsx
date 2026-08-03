'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2, Clock, FileSpreadsheet, RefreshCw, ChevronLeft, ChevronRight, Edit, Trash, Calendar } from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import LessonModal from './LessonModal';
import ExcelImportSchedule from '@/components/ExcelImportSchedule/ExcelImportSchedule';

import styles from './page.module.css';

const DAYS = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba'
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Timetable states
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [educationType, setEducationType] = useState(''); // '' = hammasi
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyLessons, setWeeklyLessons] = useState([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState('');
  const [prefilledGroupId, setPrefilledGroupId] = useState('');

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState('');
  const datePickerRef = useRef(null);

  // Fake organizationId hozircha
  const organizationId = '11111111-1111-1111-1111-111111111111';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchWeeklyLessons();
    }
  }, [selectedGroupId, currentDate]);

  // Close date picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchData(silent = false) {
    try {
      if (!silent) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      
      const [schedulesRes, groupsRes] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            id,
            group_id,
            day_of_week,
            start_time,
            end_time,
            subject_id,
            teacher_id,
            groups ( id, name, course_name, education_type ),
            subjects ( id, name ),
            teachers ( id, full_name )
          `)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase.from('groups').select('id, name, course_name, education_type')
      ]);
      
      if (schedulesRes.error) throw schedulesRes.error;
      setSchedules(schedulesRes.data || []);
      const fetchedGroups = groupsRes.data || [];
      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(fetchedGroups[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatShortDate = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}.${month}`;
  };

  async function fetchWeeklyLessons() {
    if (!selectedGroupId) return;
    try {
      const monday = getMonday(currentDate);
      const startOfWeek = formatDateStr(monday);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      const endOfWeek = formatDateStr(saturday);

      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          lesson_date,
          title,
          start_time,
          end_time,
          subject_id,
          teacher_id,
          group_id,
          lesson_type,
          teachers ( id, full_name ),
          subjects ( id, name )
        `)
        .eq('group_id', selectedGroupId)
        .gte('lesson_date', startOfWeek)
        .lte('lesson_date', endOfWeek)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setWeeklyLessons(data || []);
    } catch (err) {
      console.error('Error fetching weekly lessons:', err);
    }
  }

  const handleDeleteLesson = async (id) => {
    if (!confirm("Ushbu darsni o'chirishni xohlaysizmi?")) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      fetchWeeklyLessons();
    } catch (err) {
      alert("Xato: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Rostdan ham o\'chirasizmi?')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateLessons = async (sch) => {
    if (!confirm(`"${DAYS[sch.day_of_week]}" uchun keyingi 16 haftalik darslarni yaratishni xohlaysizmi?`)) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetJsDay = sch.day_of_week % 7;
      const todayJs = today.getDay();
      let daysUntilTarget = (targetJsDay - todayJs + 7) % 7;
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + daysUntilTarget);

      const lessonDates = [];
      for (let week = 0; week < 16; week++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + week * 7);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const start = sch.start_time?.substring(0, 5) || '09:00';
        const end = sch.end_time?.substring(0, 5) || '13:00';
        const title = `${start}-${end} | ${sch.subjects?.name || ''}`;
        lessonDates.push({
          group_id: sch.group_id,
          lesson_date: dateStr,
          title,
          start_time: sch.start_time || null,
          end_time: sch.end_time || null,
          teacher_id: sch.teacher_id || null,
          subject_id: sch.subject_id || null,
          schedule_id: sch.id,
          lesson_type: 'practice',
        });
      }

      const { data: existing } = await supabase
        .from('lessons')
        .select('lesson_date')
        .eq('group_id', sch.group_id)
        .eq('schedule_id', sch.id);

      const existingDates = new Set((existing || []).map(l => l.lesson_date));
      const toInsert = lessonDates.filter(l => !existingDates.has(l.lesson_date));

      if (toInsert.length === 0) {
        alert('Bu jadval uchun darslar allaqachon yaratilgan!');
        return;
      }
      const { error } = await supabase.from('lessons').insert(toInsert);
      if (error) throw error;
      alert(`✅ ${toInsert.length} ta dars muvaffaqiyatli yaratildi!`);
    } catch (err) {
      alert('Xato: ' + err.message);
    }
  };

  // Filtered groups for group selector
  const filteredGroups = groups.filter(g => {
    const nameMatch =
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.course_name?.toLowerCase().includes(search.toLowerCase());
    const typeMatch = !educationType || g.education_type === educationType;
    return nameMatch && typeMatch;
  });

  const handleWeekLabelClick = () => {
    const monday = getMonday(currentDate);
    setDatePickerValue(formatDateStr(monday));
    setShowDatePicker(true);
  };

  const handleDatePickerChange = (e) => {
    const val = e.target.value;
    setDatePickerValue(val);
    if (val) {
      setCurrentDate(new Date(val + 'T12:00:00'));
      setShowDatePicker(false);
    }
  };

  if (userRole === 'director') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Sizda ushbu sahifaga kirish huquqi yo'q.</div>;
  }

  const isWriteEnabled = userRole === 'sysadmin' || userRole === 'admin' || userRole === 'academic';

  const monday = getMonday(currentDate);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return (
    <div className={styles.container}>
      {/* Header: Search + Buttons */}
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Guruh nomi orqali izlash..."
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isWriteEnabled && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={18} /> Excel Import
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingSchedule(null); setShowModal(true); }}>
              <Plus size={18} /> Yangi Dars Vaqti
            </button>
          </div>
        )}
      </div>

      {/* Filters: Group selector + Week nav */}
      <div className={styles.filtersWrapper}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Ta'lim turi:</label>
          <select
            className="input"
            style={{ width: '200px', padding: '8px 12px' }}
            value={educationType}
            onChange={(e) => {
              setEducationType(e.target.value);
              setSelectedGroupId(''); // reset group on type change
            }}
          >
            <option value="">— Hammasi —</option>
            <option value="qayta_tayyorlov">Qayta tayyorlov</option>
            <option value="malaka_oshirish">Malaka oshirish</option>
          </select>

          <label style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Guruh:</label>
          <select
            className="input"
            style={{ width: '220px', padding: '8px 12px' }}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            {filteredGroups.length === 0 && (
              <option value="">— Guruh topilmadi —</option>
            )}
            {filteredGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.weekNav}>
          <button
            className={styles.weekBtn}
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() - 7);
              setCurrentDate(d);
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Clickable week label */}
          <div className={styles.weekLabelWrapper} ref={datePickerRef}>
            <button
              className={styles.weekLabel}
              onClick={handleWeekLabelClick}
              title="Sanani o'zgartirish uchun bosing"
            >
              <Calendar size={14} style={{ marginRight: '4px', opacity: 0.7 }} />
              {formatDateStr(monday)} — {formatDateStr(saturday)}
            </button>
            {showDatePicker && (
              <div className={styles.datePickerPopup}>
                <input
                  type="date"
                  className={styles.datePickerInput}
                  value={datePickerValue}
                  onChange={handleDatePickerChange}
                  autoFocus
                />
                <span className={styles.datePickerHint}>Istalgan kunni tanlang — jadval o'sha haftaga o'tadi</span>
              </div>
            )}
          </div>

          <button
            className={styles.weekBtn}
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + 7);
              setCurrentDate(d);
            }}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => setCurrentDate(new Date())}
          >
            Bugungi hafta
          </button>
        </div>
      </div>

      {/* Weekly Timetable Grid */}
      {loading ? (
        <div className={styles.loading}>Yuklanmoqda...</div>
      ) : (
        (() => {
          const mon = getMonday(currentDate);
          const daysArray = [];
          for (let i = 0; i < 6; i++) {
            const d = new Date(mon);
            d.setDate(mon.getDate() + i);
            daysArray.push(d);
          }

          const todayStr = formatDateStr(new Date());

          return (
            <div className={styles.timetableGrid}>
              {daysArray.map((dayDate, index) => {
                const dayNum = index + 1; // 1 to 6
                const dateStr = formatDateStr(dayDate);
                const isToday = dateStr === todayStr;
                const dayLessons = weeklyLessons.filter(l => l.lesson_date === dateStr);

                return (
                  <div key={index} className={`${styles.timetableDay} ${isToday ? styles.today : ''}`}>
                    <div className={styles.timetableDayHeader}>
                      <span className={styles.timetableDayName}>{DAYS[dayNum]}</span>
                      <span className={styles.timetableDayDate}>{formatShortDate(dayDate)}</span>
                    </div>

                    <div className={styles.timetableLessons}>
                      {dayLessons.length === 0 ? (
                        <div className={styles.noScheduleText} style={{ textAlign: 'center', margin: 'auto' }}>
                          Dars kiritilmagan
                        </div>
                        dayLessons.map(lesson => {
                          const start = lesson.start_time?.substring(0, 5) || '09:00';
                          const end = lesson.end_time?.substring(0, 5) || '13:00';
                          const parts = lesson.title ? lesson.title.split(' | ') : [];
                          const subjectName = lesson.subjects?.name || parts[1] || parts[0] || 'Dars';

                          // Check if lesson is finished
                          let isFinished = false;
                          if (lesson.lesson_date && lesson.end_time) {
                            const [yr, mo, dy] = lesson.lesson_date.split('-').map(Number);
                            const [hr, mn] = lesson.end_time.substring(0, 5).split(':').map(Number);
                            const lessonEnd = new Date(yr, mo - 1, dy, hr, mn, 0);
                            isFinished = new Date() > lessonEnd;
                          }

                          return (
                            <div key={lesson.id} className={`${styles.timetableLessonCard} ${lesson.lesson_type === 'theory' ? styles.theory : ''} ${isFinished ? styles.finished : ''}`}>
                              <div className={styles.timetableLessonTime}>
                                {start} - {end}
                                {isFinished && <span className={styles.finishedBadge}>Tugadi</span>}
                              </div>
                              <div className={styles.timetableLessonSub}>{subjectName}</div>
                              <div className={styles.timetableLessonTeacher}>
                                {lesson.teachers?.full_name || 'Ustoz biriktirilmagan'}
                              </div>


                              {isWriteEnabled && (
                                <div className={styles.timetableLessonFooter}>
                                  <button
                                    className={styles.scheduleActionBtn}
                                    onClick={() => {
                                      setEditingLesson(lesson);
                                      setPrefilledGroupId(selectedGroupId);
                                      setPrefilledDate(dateStr);
                                      setShowLessonModal(true);
                                    }}
                                    title="Tahrirlash"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    className={`${styles.scheduleActionBtn} ${styles.danger}`}
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    title="O'chirish"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {isWriteEnabled && (
                      <button
                        className={styles.timetableAddBtn}
                        onClick={() => {
                          setEditingLesson(null);
                          setPrefilledGroupId(selectedGroupId);
                          setPrefilledDate(dateStr);
                          setShowLessonModal(true);
                        }}
                      >
                        <Plus size={14} /> Dars qo'shish
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()
      )}

      <ScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        schedule={editingSchedule}
        groups={groups}
        onSuccess={() => fetchData(true)}
      />

      <ExcelImportSchedule
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        groups={groups}
        organizationId={organizationId}
        onSuccess={() => fetchData(true)}
      />

      <LessonModal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        lesson={editingLesson}
        groups={groups}
        prefilledDate={prefilledDate}
        prefilledGroupId={prefilledGroupId}
        onSuccess={() => fetchWeeklyLessons()}
      />
    </div>
  );
}
