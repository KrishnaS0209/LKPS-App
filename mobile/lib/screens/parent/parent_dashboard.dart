import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../providers/auth_provider.dart';
import '../../services/parent_service.dart';

// Teal accent color matching reference
const _teal = Color(0xFF14B8A6);
const _cyan = Color(0xFF06B6D4);
const _green = Color(0xFF22C55E);
const _bg = Color(0xFF111827);
const _card = Color(0xFF1F2937);
const _card2 = Color(0xFF374151);

class ParentDashboard extends StatefulWidget {
  final void Function(int index)? onNavigate;
  const ParentDashboard({super.key, this.onNavigate});
  @override
  State<ParentDashboard> createState() => _ParentDashboardState();
}

class _ParentDashboardState extends State<ParentDashboard> {
  bool _isLoading = true;
  Map<String, dynamic>? _student;
  List<dynamic> _payments = [];
  List<Map<String, dynamic>> _attendance = [];
  List<dynamic> _notices = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  ImageProvider? _getPhoto(dynamic photo) {
    if (photo == null || photo.toString().isEmpty) return null;
    final str = photo.toString();
    try {
      // base64 data URI like data:image/jpeg;base64,...
      if (str.startsWith('data:')) {
        final base64Str = str.split(',').last;
        return MemoryImage(base64Decode(base64Str));
      }
      // plain base64
      return MemoryImage(base64Decode(str));
    } catch (_) {
      // fallback to network URL
      return NetworkImage(str);
    }
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final sid = auth.user?.sid;
    final sessionId = auth.sessionId;
    final cls = auth.user?.cls;
    final token = auth.token;
    if (sid == null || sessionId == null || token == null) {
      setState(() => _isLoading = false);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        ParentService.fetchStudentRecord(token: token, sessionId: sessionId, sid: sid),
        ParentService.fetchStudentPayments(token: token, sessionId: sessionId, sid: sid),
        if (cls != null)
          ParentService.fetchStudentAttendance(token: token, sessionId: sessionId, cls: cls, sid: sid)
        else
          Future.value(<Map<String, dynamic>>[]),
        ParentService.fetchPublicNotices(),
      ]);
      debugPrint('Student sid: $sid, cls: $cls');
      debugPrint('Attendance count: ${(results[2] as List).length}');
      setState(() {
        _student = results[0] as Map<String, dynamic>?;
        _payments = results[1] as List<dynamic>;
        _attendance = results[2] as List<Map<String, dynamic>>;
        _notices = results[3] as List<dynamic>;
      });
    } catch (e) {
      debugPrint('Error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: _bg,
        body: Center(child: CircularProgressIndicator(color: _teal)),
      );
    }

    final auth = context.watch<AuthProvider>();
    final studentName = [_student?['fn'], _student?['ln']]
        .where((e) => e != null && e.toString().isNotEmpty)
        .join(' ') ?? 'Student';
    final presentCount = _attendance.where((i) => i['status'] == 'P').length;
    final attendanceRate = _attendance.isNotEmpty
        ? ((presentCount / _attendance.length) * 100).toStringAsFixed(2)
        : '0.00';
    final paymentTotal = _payments.fold<double>(
      0, (s, i) => s + (double.tryParse(i['amt']?.toString() ?? '0') ?? 0));
    final totalFee = double.tryParse(_student?['fee']?.toString() ?? '0') ?? 0;
    final remaining = totalFee - paymentTotal;

    return Scaffold(
      backgroundColor: _bg,
      drawer: _buildDrawer(context, auth, studentName),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: _teal,
          backgroundColor: _card,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Header ──────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Builder(builder: (ctx) => GestureDetector(
                        onTap: () => Scaffold.of(ctx).openDrawer(),
                        child: const Icon(Icons.menu, color: Colors.white, size: 26),
                      )),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text('LORD KRISHNA PUBLIC SCHOOL',
                          style: GoogleFonts.poppins(
                            fontSize: 14, fontWeight: FontWeight.w700,
                            color: Colors.white, letterSpacing: 0.3)),
                      ),
                      GestureDetector(
                        onTap: _loadData,
                        child: const Icon(Icons.refresh, color: Colors.white, size: 24),
                      ),
                    ],
                  ),
                ),

                // ── Student Card ─────────────────────────────────────
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _card,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: _teal.withOpacity(0.2),
                        backgroundImage: _getPhoto(_student?['photo']),
                        child: _student?['photo'] == null || (_student!['photo'] as String).isEmpty
                            ? Text(
                                studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S',
                                style: GoogleFonts.poppins(
                                  fontSize: 22, fontWeight: FontWeight.w700, color: _teal),
                              )
                            : null,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              studentName,
                              style: GoogleFonts.poppins(
                                fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Class ${_student?['cls'] ?? 'N/A'}  •  Roll No. ${_student?['roll'] ?? 'N/A'}',
                              style: GoogleFonts.poppins(
                                fontSize: 13, color: _green, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1, end: 0),

                const SizedBox(height: 16),

                // ── Stat Cards ───────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Expanded(child: _StatCard(
                        icon: Iconsax.calendar_1,
                        label: 'Attendance',
                        value: '$attendanceRate%',
                        valueColor: double.parse(attendanceRate) < 75
                            ? const Color(0xFFEF4444) : _green,
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: _StatCard(
                        icon: Iconsax.document_text1,
                        label: 'Result',
                        value: 'View',
                        valueColor: _green,
                      )),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // ── Quick Action ─────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Quick Action',
                        style: GoogleFonts.poppins(
                          fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                      const Divider(color: Color(0xFF374151), height: 20),
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 3,
                        mainAxisSpacing: 20,
                        crossAxisSpacing: 20,
                        childAspectRatio: 0.9,
                        children: [
                          _ActionTile(icon: Iconsax.calendar_1, label: 'Attendance', color: _teal, onTap: () => widget.onNavigate?.call(1)),
                          _ActionTile(icon: Iconsax.wallet, label: 'Fee Details', color: _cyan, onTap: () => widget.onNavigate?.call(4)),
                          _ActionTile(icon: Iconsax.notification, label: 'Notices', color: _teal, onTap: () => widget.onNavigate?.call(0)),
                          _ActionTile(icon: Iconsax.document_text1, label: 'Result', color: _cyan, onTap: () => widget.onNavigate?.call(3)),
                          _ActionTile(icon: Iconsax.clock, label: 'Timetable', color: _teal, onTap: () {}),
                          _ActionTile(icon: Iconsax.profile_2user, label: 'Profile', color: _cyan, onTap: () => widget.onNavigate?.call(5)),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // ── Fee Alert ────────────────────────────────────────
                if (remaining > 0)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C3AED).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF7C3AED).withOpacity(0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Iconsax.wallet, color: Color(0xFFA78BFA), size: 28),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Fee Pending',
                                style: GoogleFonts.poppins(
                                  fontSize: 15, fontWeight: FontWeight.w700,
                                  color: Colors.white)),
                              Text('₹${remaining.toStringAsFixed(0)} outstanding',
                                style: GoogleFonts.poppins(
                                  fontSize: 13, color: const Color(0xFFA78BFA))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 400.ms),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, AuthProvider auth, String studentName) {
    // index map: 0=Alerts, 1=Attendance, 2=Dashboard, 3=Result, 4=Fees
    void nav(int index) {
      Navigator.pop(context);
      widget.onNavigate?.call(index);
    }

    return Drawer(
      backgroundColor: _card,
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              color: _bg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: _teal.withOpacity(0.2),
                    backgroundImage: _getPhoto(_student?['photo']),
                    child: _student?['photo'] == null || (_student!['photo'] as String).isEmpty
                        ? Text(
                            studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S',
                            style: GoogleFonts.poppins(
                              fontSize: 28, fontWeight: FontWeight.w700, color: _teal),
                          )
                        : null,
                  ),
                  const SizedBox(height: 14),
                  Text(studentName,
                    style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text('Class ${_student?['cls'] ?? ''} • Roll ${_student?['roll'] ?? ''}',
                    style: GoogleFonts.poppins(fontSize: 13, color: Colors.white60)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  _DrawerItem(icon: Iconsax.home, label: 'Dashboard', color: _teal, onTap: () => nav(2)),
                  _DrawerItem(icon: Iconsax.calendar_1, label: 'Attendance', color: _teal, onTap: () => nav(1)),
                  _DrawerItem(icon: Iconsax.document_text1, label: 'Result', color: _cyan, onTap: () => nav(3)),
                  _DrawerItem(icon: Iconsax.wallet, label: 'Fee Details', color: _cyan, onTap: () => nav(4)),
                  _DrawerItem(icon: Iconsax.notification, label: 'Alerts & Notices', color: _teal, onTap: () => nav(0)),
                  _DrawerItem(icon: Iconsax.profile_2user, label: 'Profile', color: _teal, onTap: () => nav(5)),
                ],
              ),
            ),
            const Divider(color: Color(0xFF374151), height: 1),
            _DrawerItem(
              icon: Iconsax.logout,
              label: 'Log out',
              color: const Color(0xFFEF4444),
              onTap: () {
                auth.signOut();
                Navigator.of(context).pushReplacementNamed('/login');
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color valueColor;

  const _StatCard({
    required this.icon, required this.label,
    required this.value, required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: _teal, size: 28),
          const SizedBox(height: 12),
          Text(label,
            style: GoogleFonts.poppins(
              fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(value,
            style: GoogleFonts.poppins(
              fontSize: 22, fontWeight: FontWeight.w700, color: valueColor)),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1, end: 0, delay: 200.ms);
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(label,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              fontSize: 11, color: Colors.white70, fontWeight: FontWeight.w500)),
        ],
      ).animate().fadeIn(duration: 500.ms).scale(delay: 300.ms),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon, required this.label,
    required this.color, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color, size: 22),
      title: Text(label,
        style: GoogleFonts.poppins(
          fontSize: 15, color: Colors.white, fontWeight: FontWeight.w500)),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 2),
    );
  }
}
