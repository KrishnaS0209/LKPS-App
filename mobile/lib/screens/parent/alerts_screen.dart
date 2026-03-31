import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../services/parent_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _alerts = [];
  List<dynamic> _notices = [];

  @override
  void initState() {
    super.initState();
    _loadData();
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
      // Fetch student data, attendance, payments, and notices
      final results = await Future.wait([
        ParentService.fetchStudentRecord(token: token, sessionId: sessionId, sid: sid),
        if (cls != null)
          ParentService.fetchStudentAttendance(token: token, sessionId: sessionId, cls: cls, sid: sid)
        else
          Future.value(<Map<String, dynamic>>[]),
        ParentService.fetchStudentPayments(token: token, sessionId: sessionId, sid: sid),
        ParentService.fetchPublicNotices(),
      ]);

      final student = results[0] as Map<String, dynamic>?;
      final attendance = results[1] as List<Map<String, dynamic>>;
      final payments = results[2] as List<dynamic>;
      final notices = results[3] as List<dynamic>;

      List<Map<String, dynamic>> alerts = [];

      // Check attendance
      if (attendance.isNotEmpty) {
        final presentCount = attendance.where((item) => item['status'] == 'P').length;
        final attendanceRate = (presentCount / attendance.length) * 100;
        
        if (attendanceRate < 75) {
          alerts.add({
            'type': 'alert',
            'icon': Iconsax.warning_2,
            'title': 'Low Attendance',
            'message': 'Attendance is ${attendanceRate.toStringAsFixed(1)}%. Minimum 75% required.',
            'color': const Color(0xFFEF4444),
          });
        }
      }

      // Check fee status
      final totalFee = double.tryParse(student?['fee']?.toString() ?? '0') ?? 0;
      final paymentTotal = payments.fold<double>(
        0,
        (sum, item) => sum + (double.tryParse(item['amt']?.toString() ?? '0') ?? 0),
      );
      final remaining = totalFee - paymentTotal;

      if (remaining > 0) {
        alerts.add({
          'type': 'alert',
          'icon': Iconsax.wallet,
          'title': 'Fee Pending',
          'message': 'Outstanding fee balance: ₹${remaining.toStringAsFixed(0)}',
          'color': const Color(0xFFF59E0B),
        });
      }

      setState(() {
        _alerts = alerts;
        _notices = notices;
      });
    } catch (e) {
      debugPrint('Error loading data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Color _getTagColor(String? tag) {
    switch (tag?.toLowerCase()) {
      case 'exam':
      case 'examination':
        return const Color(0xFFEF4444);
      case 'holiday':
        return const Color(0xFF10B981);
      case 'event':
        return const Color(0xFF3B82F6);
      case 'important':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF8B5CF6);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.white));
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      backgroundColor: const Color(0xFF1E293B),
      color: Colors.white,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Alerts Section
            if (_alerts.isNotEmpty) ...[
              Text(
                'Alerts',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 16),
              ..._alerts.map((alert) => Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: (alert['color'] as Color).withOpacity(0.3),
                    width: 2,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: (alert['color'] as Color).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        alert['icon'] as IconData,
                        color: alert['color'] as Color,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            alert['title'] as String,
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            alert['message'] as String,
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )).toList(),
              const SizedBox(height: 24),
            ],

            // Notices Section
            Text(
              'Notices',
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            
            if (_notices.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    children: [
                      Icon(Iconsax.notification, size: 64, color: Colors.white30),
                      const SizedBox(height: 16),
                      Text(
                        'No notices available',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ..._notices.map((notice) {
                final tag = notice['tag'] as String?;
                final tagColor = _getTagColor(tag);

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (tag != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: tagColor.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                tag.toUpperCase(),
                                style: GoogleFonts.poppins(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: tagColor,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                          ],
                          if (notice['createdAt'] != null)
                            Text(
                              DateFormat('dd MMM yyyy').format(
                                DateTime.parse(notice['createdAt']),
                              ),
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                color: Colors.white54,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        notice['title'] ?? 'Notice',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      if (notice['body'] != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          notice['body'],
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            color: Colors.white70,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }
}
