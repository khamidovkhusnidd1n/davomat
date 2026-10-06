import os

layout_path = r"admin/src/app/(dashboard)/layout.jsx"

with open(layout_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will inject the notification logic.
# After: const [sidebarOpen, setSidebarOpen] = useState(false);
# I will add state for notification and user profile.

injection_state = """  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showNotification, setShowNotification] = useState(false);"""

content = content.replace("const [sidebarOpen, setSidebarOpen] = useState(false);", injection_state)

# Inside checkAuth:
# else { setLoading(false); } -> else { setLoading(false); fetchUser(session.user.id); }

injection_auth = """      } else {
        setLoading(false);
        const { data: user } = await supabase.from('users').select('id, full_name, role').eq('id', session.user.id).single();
        if (user) {
          setCurrentUser(user);
          if (user.full_name?.includes('Guldona') || user.full_name?.includes('Dilnavoz')) {
            setShowNotification(true);
          }
        }
      }"""

content = content.replace("      } else {\n        setLoading(false);\n      }", injection_auth)

# Add Notification banner in the layout right before <div className={styles.content}>
injection_banner = """        </header>
        {showNotification && (
          <div style={{ backgroundColor: '#ffedd5', color: '#9a3412', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 20px 20px', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
            <span><strong>Eslatma:</strong> O'zingizga tegishli guruh uchun bugungi davomatni web paneldan kiritishingiz mumkin!</span>
            <button onClick={() => setShowNotification(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412' }}><X size={18}/></button>
          </div>
        )}
        <div className={styles.content}>"""

content = content.replace("        </header>\n        <div className={styles.content}>", injection_banner)

with open(layout_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated layout.jsx")
