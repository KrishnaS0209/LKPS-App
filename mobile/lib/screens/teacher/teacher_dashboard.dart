import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import '../../providers/auth_provider.dart';
import '../../services/teacher_service.dart';
import '../../services/parent_service.dart';
import '../../widgets/info_card.dart';

class TeacherDashboard extends StatefulWidget {
  const TeacherDashboard({super.key});

  @override
  State<TeacherDashboard> createState() => _TeacherDashboardState();
}

class _TeacherDashboardState extends State<TeacherDashboard> {
  bool _isLoading = true;
  List<String> _classes = [];
  List<dynamic> _messages = [];
  List<dynamic> _notices = [];
  int _studentCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    if (auth.token == null || auth.sessionId == null) return;

    setState(() => _isLoading = true);

    try {
      final sessionData = await TeacherService.fetchSessionData(
        token: auth.token!,
        sessionId: auth.sessionId!,
      );

      final messages = await TeacherService.fetchMessages(
        token: auth.token!,
        sessionId: auth.sessionId!,
      );

      final notices = await ParentService.fetchPublicNotices();
      final classes = List<String>.from(sessionData['classes'] ?? []);

      int studentCount = 0;
      if (classes.isNotEmpty) {
        final students = await TeacherService.fetchClassStudents(
          token: auth.token!,
          sessionId: auth.sessionId!,
          cls: classes.first,
        );
        studentCount = students.length;
      }

      setState(() {
        _classes = classes;
        _messages = messages;
        _notices = notices;
        _studentCount = studentCount;
      });
    } catch (e) {
      debugPrint('Error loading data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFEFF6FF), Color(0xFFF8FAFC)],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Iconsax.teacher, color: Colors.white, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('TEACHER PORTAL', style: Theme.of(context).textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700, color: const Color(0xFF3B82F6), letterSpacing: 1.2)),
                            const SizedBox(height: 4),
                            Text('Welcome back!', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                          ],
                        ),
                      ),
                    ],
                  ).animate().fadeIn(duration: 400.ms).slideX(begin: -0.2, end: 0),
                  const SizedBox(height: 8),
                  Text(auth.user?.displayName ?? 'Teacher', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF64748B))).animate().fadeIn(delay: 100.ms, duration: 400.ms),
                  const SizedBox(height: 24),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      InfoCard(icon: Iconsax.book_1, title: 'My Classes', value: _classes.length.toString(), color: const Color(0xFF3B82F6)),
                      InfoCard(icon: Iconsax.profile_2user, title: 'Students', value: _studentCount.toString(), color: const Color(0xFF10B981)),
                      InfoCard(icon: Iconsax.message, title: 'Messages', value: _messages.length.toString(), color: const Color(0xFFF59E0B)),
                      InfoCard(icon: Iconsax.notification, title: 'Notices', value: _notices.length.toString(), color: const Color(0xFFEF4444)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(10)), child: const Icon(Iconsax.book_1, color: Color(0xFF3B82F6), size: 20)),
                            const SizedBox(width: 12),
                            Text('Your Classes', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (_classes.isEmpty)
                          const Text('No classes assigned yet.', style: TextStyle(color: Color(0xFF64748B)))
                        else
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: _classes.map((cls) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)]), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFBFDBFE))),
                              child: Text(cls, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1E40AF))),
                            )).toList(),
                          ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 200.ms, duration: 400.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(10)), child: const Icon(Iconsax.notification, color: Color(0xFFF59E0B), size: 20)),
                            const SizedBox(width: 12),
                            Text('Recent Notices', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (_notices.isEmpty)
                          const Text('No notices available.', style: TextStyle(color: Color(0xFF64748B)))
                        else
                          ..._notices.take(3).map((notice) => Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)]), borderRadius: BorderRadius.circular(16)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Iconsax.info_circle, size: 18, color: Color(0xFF92400E)),
                                    const SizedBox(width: 8),
                                    Expanded(child: Text(notice['title'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF92400E)))),
                                  ],
                                ),
                                if (notice['body'] != null) ...[const SizedBox(height: 8), Text(notice['body'], style: const TextStyle(color: Color(0xFF78350F), height: 1.5))],
                              ],
                            ),
                          )).toList(),
                      ],
                    ),
                  ).animate().fadeIn(delay: 300.ms, duration: 400.ms).slideY(begin: 0.1, end: 0),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
