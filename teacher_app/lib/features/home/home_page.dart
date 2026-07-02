import 'package:flutter/material.dart';
import '../../main.dart'; // import supabase
import 'package:intl/intl.dart';
import '../attendance/attendance_page.dart';
import '../auth/login_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = true;
  String _teacherName = '';
  List<dynamic> _todayLessons = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = supabase.auth.currentUser;
      if (user == null) return;

      // Hozirgi sanani olish (faqat yil-oy-kun)
      final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());

      // 1. O'qituvchi ma'lumotlari
      final userRes = await supabase
          .from('users')
          .select('full_name, id')
          .eq('id', user.id)
          .single();
          
      _teacherName = userRes['full_name'] ?? 'Sinf sardori';

      // 2. O'qituvchining guruhlari va bugungi darslari
      // MVP uchun osonlashtirilgan query (Guruhni topib, uning bugungi darslarini olamiz)
      final groupsRes = await supabase
          .from('groups')
          .select('id, name, course_name, lessons(id, title, lesson_date)')
          .eq('monitor_id', user.id)
          .eq('lessons.lesson_date', todayStr);

      _todayLessons = [];
      for (var group in groupsRes) {
        final lessons = group['lessons'] as List<dynamic>? ?? [];
        for (var lesson in lessons) {
          _todayLessons.add({
            'lesson_id': lesson['id'],
            'title': lesson['title'],
            'group_name': group['name'],
            'course_name': group['course_name'],
            'group_id': group['id'],
          });
        }
      }

    } catch (e) {
      debugPrint('Xatolik: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _signOut() async {
    await supabase.auth.signOut();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bosh sahifa'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _signOut,
            tooltip: 'Tizimdan chiqish',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    'Assalomu alaykum,\n$_teacherName!',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  Text(
                    'Bugungi darslar',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  if (_todayLessons.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Column(
                        children: [
                          Icon(Icons.event_available, size: 48, color: Colors.grey),
                          SizedBox(height: 16),
                          Text(
                            'Bugun uchun darslar yo\'q',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._todayLessons.map((lesson) => Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: colorScheme.outlineVariant),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            leading: CircleAvatar(
                              backgroundColor: colorScheme.primaryContainer,
                              child: Icon(Icons.book,
                                  color: colorScheme.onPrimaryContainer),
                            ),
                            title: Text(
                              lesson['group_name'],
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text('${lesson['course_name']} • ${lesson['title']}'),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => AttendancePage(
                                    lessonId: lesson['lesson_id'],
                                    groupName: lesson['group_name'],
                                    lessonTitle: '${lesson['course_name']} • ${lesson['title']}',
                                  ),
                                ),
                              );
                            },
                          ),
                        )),
                ],
              ),
            ),
    );
  }
}
