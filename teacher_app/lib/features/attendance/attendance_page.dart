import 'package:flutter/material.dart';
import '../../main.dart'; // import supabase
import 'package:intl/intl.dart';

class AttendancePage extends StatefulWidget {
  final String lessonId;
  final String groupName;
  final String lessonTitle;

  const AttendancePage({
    super.key,
    required this.lessonId,
    required this.groupName,
    required this.lessonTitle,
  });

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  bool _isLoading = true;
  List<dynamic> _students = [];
  Map<String, String> _attendanceMap = {}; // student_id -> status ('present', 'absent', 'late')

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      // 1. Darsga tegishli guruhni va u yerdagi o'quvchilarni topamiz
      final lessonRes = await supabase
          .from('lessons')
          .select('group_id')
          .eq('id', widget.lessonId)
          .single();
          
      final groupId = lessonRes['group_id'];

      // O'quvchilarni olish
      final studentsRes = await supabase
          .from('students')
          .select('id, user_id, users(full_name)')
          .eq('group_id', groupId)
          .eq('status', 'active');

      _students = studentsRes;

      // 2. Agar avval belgilangan davomat bo'lsa, uni yuklab olamiz
      final attendanceRes = await supabase
          .from('attendance')
          .select('student_id, status')
          .eq('lesson_id', widget.lessonId);

      _attendanceMap = {};
      for (var att in attendanceRes) {
        _attendanceMap[att['student_id'].toString()] = att['status'];
      }

      // Hali belgilanmagan bo'lsa barchaga default 'present' beramiz MVP uchun
      for (var student in _students) {
        final id = student['id'].toString();
        if (!_attendanceMap.containsKey(id)) {
          _attendanceMap[id] = 'present';
        }
      }

    } catch (e) {
      debugPrint('Xatolik: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Xatolik yuz berdi')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveAttendance() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final user = supabase.auth.currentUser;
      if (user == null) throw Exception('Tizimga kirmagansiz');

      // Barchasini saqlash uchun ro'yxat tayyorlash
      List<Map<String, dynamic>> upsertData = [];
      
      for (var student in _students) {
        final id = student['id'].toString();
        upsertData.add({
          'lesson_id': widget.lessonId,
          'student_id': student['id'],
          'status': _attendanceMap[id],
          'marked_by': user.id,
        });
      }

      // Upsert: mavjud bo'lsa yangilaydi (CONFLICT by lesson_id, student_id)
      await supabase
          .from('attendance')
          .upsert(
            upsertData,
            onConflict: 'lesson_id, student_id',
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Davomat muvaffaqiyatli saqlandi!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      debugPrint('Saqlashda xatolik: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Saqlashda xatolik. Ehtimol vaqt cheklovi (24s) tugagan.'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.groupName, style: const TextStyle(fontSize: 16)),
            Text(
              widget.lessonTitle,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _isLoading ? null : _saveAttendance,
            tooltip: 'Saqlash',
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 20, color: Colors.blue),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "Eslatma: Davomatni dars sanasidan boshlab 24 soat ichida o'zgartirish mumkin.",
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: _students.length,
                    itemBuilder: (context, index) {
                      final student = _students[index];
                      final id = student['id'].toString();
                      final user = student['users'];
                      final fullName = user != null ? user['full_name'] : 'Noma\'lum';
                      
                      return Column(
                        children: [
                          ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            leading: CircleAvatar(
                              child: Text(fullName.isNotEmpty ? fullName[0].toUpperCase() : '?'),
                            ),
                            title: Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Row(
                              children: [
                                _StatusChip(
                                  label: 'Bor',
                                  icon: Icons.check,
                                  color: Colors.green,
                                  isSelected: _attendanceMap[id] == 'present',
                                  onTap: () => setState(() => _attendanceMap[id] = 'present'),
                                ),
                                const SizedBox(width: 8),
                                _StatusChip(
                                  label: 'Yo\'q',
                                  icon: Icons.close,
                                  color: Colors.red,
                                  isSelected: _attendanceMap[id] == 'absent',
                                  onTap: () => setState(() => _attendanceMap[id] = 'absent'),
                                ),
                                const SizedBox(width: 8),
                                _StatusChip(
                                  label: 'Kech',
                                  icon: Icons.access_time,
                                  color: Colors.orange,
                                  isSelected: _attendanceMap[id] == 'late',
                                  onTap: () => setState(() => _attendanceMap[id] = 'late'),
                                ),
                              ],
                            ),
                          ),
                          const Divider(height: 1),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isLoading ? null : _saveAttendance,
        icon: const Icon(Icons.save),
        label: const Text('Saqlash'),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _StatusChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : Colors.transparent,
          border: Border.all(
            color: isSelected ? color : Colors.grey.withOpacity(0.3),
            width: isSelected ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? color : Colors.grey),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? color : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
