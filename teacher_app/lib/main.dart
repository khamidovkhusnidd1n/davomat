import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'features/auth/login_page.dart';
import 'features/home/home_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await Supabase.initialize(
    url: 'https://uhbcnmcevcmpghwgsdsc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDQ1NTQsImV4cCI6MjA5ODQ4MDU1NH0.x-aLh0-qfzVde2qYUd4DM4o-Y5w7x2mridiYQTcaQsg',
  );

  // Initialize Hive for offline caching
  await Hive.initFlutter();
  await Hive.openBox('davomad_cache');

  // Initialize Intl data for Uzbek formatting
  await initializeDateFormatting('uz', null);

  runApp(
    const ProviderScope(
      child: DavomadApp(),
    ),
  );
}

final supabase = Supabase.instance.client;

class DavomadApp extends StatelessWidget {
  const DavomadApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DAVOMAT - Teacher',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: const SplashPage(),
    );
  }

  ThemeData _buildTheme(Brightness brightness) {
    final baseTheme = ThemeData(
      brightness: brightness,
      useMaterial3: true,
      colorSchemeSeed: const Color(0xFF6366F1), // Indigo primary
    );

    return baseTheme.copyWith(
      textTheme: GoogleFonts.interTextTheme(baseTheme.textTheme),
      scaffoldBackgroundColor: brightness == Brightness.dark 
          ? const Color(0xFF0F172A) // slate-900
          : const Color(0xFFF8FAFC), // slate-50
    );
  }
}

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _redirect();
  }

  Future<void> _redirect() async {
    await Future.delayed(const Duration(seconds: 2));
    final session = supabase.auth.currentSession;
    if (session != null) {
      // User is logged in
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomePage()),
      );
    } else {
      // User is not logged in
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Color(0xFF6366F1)),
            SizedBox(height: 16),
            Text(
              'DAVOMAT',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF6366F1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


