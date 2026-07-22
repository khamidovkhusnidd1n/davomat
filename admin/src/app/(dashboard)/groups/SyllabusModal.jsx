import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Plus, Trash2 } from 'lucide-react';
import styles from './page.module.css';

export default function SyllabusModal({ isOpen, onClose, group }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    if (isOpen && group) {
      fetchSyllabus();
    } else {
      setTopics([]);
      setNewTopic('');
    }
  }, [isOpen, group]);

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('syllabuses')
        .select('*')
        .eq('group_id', group.id)
        .order('day_number', { ascending: true });
        
      if (error) {
        if (error.code === '42P01') {
           console.log("Table syllabuses does not exist yet");
        } else {
           throw error;
        }
      } else {
        setTopics(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    
    try {
      const nextDay = topics.length > 0 ? Math.max(...topics.map(t => t.day_number)) + 1 : 1;
      const { error } = await supabase.from('syllabuses').insert([{
        group_id: group.id,
        day_number: nextDay,
        topic_title: newTopic.trim()
      }]);
      if (error) throw error;
      
      setNewTopic('');
      fetchSyllabus();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('syllabuses').delete().eq('id', id);
      if (error) throw error;
      fetchSyllabus();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: '600px', width: '90%' }}>
        <div className={styles.modalHeader}>
          <h2>{group?.name} - Dars dasturi (Syllabus)</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              className="input" 
              style={{ flex: 1 }}
              placeholder="Yangi mavzu nomini kiriting..." 
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={18} /> Qo'shish
            </button>
          </form>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Yuklanmoqda...</div>
          ) : topics.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              Mavzular kiritilmagan. Yuqoridan yangi mavzu qo'shing.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topics.map((topic, index) => (
                <li key={topic.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{index + 1}-kun.</span>
                    <span>{topic.topic_title}</span>
                  </div>
                  <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(topic.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
