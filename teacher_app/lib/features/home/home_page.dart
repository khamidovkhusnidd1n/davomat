import 'package:flutter/material.dart';
import '../../main.dart'; // import supabase
import 'package:intl/intl.dart';
import '../attendance/attendance_page.dart';
import '../auth/login_page.dart';
import 'package:google_fonts/google_fonts.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = true;
  String _teacherName = '';
  List<dynamic> _todaySchedules = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = supabase.auth.currentUser;
      if (user == null) return;

      // 1. O'qituvchi ma'lumotlari
      final userRes = await supabase
          .from('users')
          .select('full_name, id')
          .eq('id', user.id)
          .single();
          
      _teacherName = userRes['full_name'] ?? 'Talaba / Tutor';

      // 2. O'qituvchining/Sardorning guruhlari
      final groupsRes = await supabase
          .from('groups')
          .select('id, name, course_name')
          .or('tutor_id.eq.${user.id},monitor_id.eq.${user.id}');
          
      if (groupsRes.isEmpty) {
        _todaySchedules = [];
        return;
      }

      final groupIds = groupsRes.map((g) => g['id'] as String).toList();
      final currentDayOfWeek = DateTime.now().weekday; // 1=Dushanba, 7=Yakshanba

      // 3. Ushbu guruhlarning BUGUNGI jadvali (schedules)
      final schedulesRes = await supabase
          .from('schedules')
          .select('id, group_id, start_time, end_time')
          .eq('day_of_week', currentDayOfWeek)
          .inFilter('group_id', groupIds)
          .order('start_time', ascending: true);

      // 4. Jadvalni guruh ma'lumotlari bilan birlashtiramiz
      _todaySchedules = schedulesRes.map((sch) {
        final group = groupsRes.firstWhere((g) => g['id'] == sch['group_id']);
        return {
          'schedule_id': sch['id'],
          'group_id': group['id'],
          'group_name': group['name'],
          'course_name': group['course_name'],
          'start_time': sch['start_time'].toString().substring(0, 5), // '14:00:00' -> '14:00'
          'end_time': sch['end_time'].toString().substring(0, 5),
        };
      }).toList();

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

  Future<void> _openAttendance(Map<dynamic, dynamic> schedule) async {
    // 1. Dars (lesson) bor-yo'qligini tekshiramiz
    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    
    // UI bloklanmasligi uchun loading ko'rsatish mumkin, 
    // lekin hozircha to'g'ridan-to'g'ri so'rov jo'natamiz
    showDialog(
      context: context, 
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator())
    );

    try {
      final existingLesson = await supabase
          .from('lessons')
          .select('id')
          .eq('group_id', schedule['group_id'])
          .eq('lesson_date', todayStr)
          .maybeSingle();

      String lessonId;

      if (existingLesson == null) {
        // Bugun uchun dars yaratamiz
        final newLesson = await supabase
            .from('lessons')
            .insert({
              'group_id': schedule['group_id'],
              'lesson_date': todayStr,
              'title': '${schedule['start_time']} darsi', // Masalan: "14:00 darsi"
            })
            .select('id')
            .single();
        lessonId = newLesson['id'];
      } else {
        lessonId = existingLesson['id'];
      }

      if (mounted) Navigator.pop(context); // loading ni yopish

      // Davomat sahifasiga o'tish
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => AttendancePage(
              lessonId: lessonId,
              groupName: schedule['group_name'],
              lessonTitle: '${schedule['course_name']} (${schedule['start_time']}-${schedule['end_time']})',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) Navigator.pop(context); // loading ni yopish
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xatolik yuz berdi: $e')),
      );
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
    final now = DateTime.now();
    final dateStr = DateFormat('d-MMMM, EEEE', 'uz').format(now);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6), // Yengil kulrang fon
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.black87,
        title: Text(
          'DAVOMAD',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w800,
            letterSpacing: 1,
            color: colorScheme.primary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
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
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                children: [
                  // Sarlavha qismi
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [colorScheme.primary, colorScheme.tertiary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: colorScheme.primary.withOpacity(0.3),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          dateStr,
                          style: GoogleFonts.inter(
                            color: Colors.white70,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Salom,\n$_teacherName!',
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),
                  
                  // Bugungi darslar yozuvi
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 20, color: Colors.black54),
                      const SizedBox(width: 8),
                      Text(
                        'Bugungi jadvalingiz',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Darslar ro'yxati
                  if (_todaySchedules.isEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 20),
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.free_breakfast_rounded, size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text(
                            'Bugun darsingiz yo\'q',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Dam oling yoki jadvalingizni tekshiring',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._todaySchedules.map((schedule) => Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(20),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(20),
                              onTap: () => _openAttendance(schedule),
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Row(
                                  children: [
                                    // Vaqt qismi
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: colorScheme.primary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Column(
                                        children: [
                                          Text(
                                            schedule['start_time'],
                                            style: GoogleFonts.inter(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                              color: colorScheme.primary,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            schedule['end_time'],
                                            style: GoogleFonts.inter(
                                              fontWeight: FontWeight.w500,
                                              fontSize: 12,
                                              color: Colors.grey.shade600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    
                                    // Guruh ma'lumotlari
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            schedule['group_name'],
                                            style: GoogleFonts.outfit(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.black87,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            schedule['course_name'],
                                            style: GoogleFonts.inter(
                                              fontSize: 14,
                                              color: Colors.grey.shade600,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    
                                    // Davomat belgisi
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: colorScheme.secondaryContainer,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        Icons.check_circle_outline_rounded,
                                        color: colorScheme.onSecondaryContainer,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        )),
                ],
              ),
            ),
    );
  }
}
