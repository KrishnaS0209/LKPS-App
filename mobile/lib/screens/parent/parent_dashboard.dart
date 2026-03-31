import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:iconsax/iconsax.dart';
import '../../providers/auth_provider.dart';
import '../../services/parent_service.dart';
import '../../widgets/info_card.dart';

class ParentDashboard extends StatefulWidget {
  const ParentDashboard({super.key});

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

  String _formatCurrency(dynamic amount) {
    final value = double.tryParse(amount?.toString() ?? '0') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(value);
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

      setState(() {
        _student = results[0] as Map<String, dynamic>?;
        _payments = results[1] as List<dynamic>;
        _attendance = results[2] as List<Map<String, dynamic>>;
        _notices = results[3] as List<dynamic>;
      });
    } catch (e) {
      debugPrint('Error loading data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final paymentTotal = _payments.fold<double>(
      0,
      (sum, item) => sum + (double.tryParse(item['amt']?.toString() ?? '0') ?? 0),
    );

    final presentCount = _attendance.where((item) => item['status'] == 'P').length;
    final attendanceRate = _attendance.isNotEmpty ? ((presentCount / _attendance.length) * 100).round() : 0;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'PARENT PORTAL',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF8B5CF6),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  [_student?['fn'], _student?['ln']].where((e) => e != null && e.toString().isNotEmpty).join(' ') ?? 'Student',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Track your child\'s attendance, fees, and stay updated with school announcements.',
                  style: TextStyle(
                    fontSize: 16,
                    height: 1.5,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    InfoCard(
                      icon: Iconsax.book,
                      title: 'Class',
                      value: _student?['cls'] ?? 'N/A',
                      color: const Color(0xFF8B5CF6),
                    ),
                    InfoCard(
                      icon: Iconsax.chart,
                      title: 'Attendance',
                      value: '$attendanceRate%',
                      color: const Color(0xFF10B981),
                    ),
                    InfoCard(
                      icon: Iconsax.wallet,
                      title: 'Fees Paid',
                      value: _formatCurrency(paymentTotal),
                      color: const Color(0xFFF59E0B),
                    ),
                    InfoCard(
                      icon: Iconsax.notification,
                      title: 'Notices',
                      value: _notices.length.toString(),
                      color: const Color(0xFFEF4444),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFDBE7F5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Student Information',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 14),
                      _InfoRow(label: 'Class', value: _student?['cls'] ?? 'N/A'),
                      _InfoRow(label: 'Roll Number', value: _student?['roll'] ?? 'N/A'),
                      _InfoRow(label: 'Father\'s Name', value: _student?['father'] ?? 'N/A'),
                      _InfoRow(
                        label: 'Contact',
                        value: _student?['fphone'] ?? _student?['mphone'] ?? _student?['ph'] ?? 'N/A',
                        isLast: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFDBE7F5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Recent Attendance',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (_attendance.isEmpty)
                        const Text(
                          'No attendance records available.',
                          style: TextStyle(color: Color(0xFF64748B)),
                        )
                      else
                        ..._attendance.take(7).map((item) {
                          final status = item['status'];
                          final bgColor = status == 'P'
                              ? const Color(0xFFF0FDF4)
                              : status == 'A'
                                  ? const Color(0xFFFEF2F2)
                                  : const Color(0xFFFFFBEB);
                          final borderColor = status == 'P'
                              ? const Color(0xFFBBF7D0)
                              : status == 'A'
                                  ? const Color(0xFFFECACA)
                                  : const Color(0xFFFDE68A);
                          final statusColor = status == 'P'
                              ? const Color(0xFF10B981)
                              : status == 'A'
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFFF59E0B);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: bgColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: borderColor),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  DateFormat('MMM d, y').format(DateTime.parse(item['date'])),
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: statusColor,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    status == 'P' ? 'Present' : status == 'A' ? 'Absent' : 'Leave',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFDBE7F5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'School Notices',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (_notices.isEmpty)
                        const Text(
                          'No active notices.',
                          style: TextStyle(color: Color(0xFF64748B)),
                        )
                      else
                        ..._notices.take(3).map((notice) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  notice['title'] ?? '',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF92400E),
                                  ),
                                ),
                                if (notice['body'] != null) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    notice['body'],
                                    style: const TextStyle(
                                      color: Color(0xFF78350F),
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 6),
                                Text(
                                  notice['tag'] ?? 'General',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFFA16207),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isLast;

  const _InfoRow({
    required this.label,
    required this.value,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(
                bottom: BorderSide(color: Color(0xFFF1F5F9)),
              ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF64748B),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
