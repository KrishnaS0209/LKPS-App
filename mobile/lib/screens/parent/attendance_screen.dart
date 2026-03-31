import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../services/parent_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _attendance = [];

  @override
  void initState() {
    super.initState();
    _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    final auth = context.read<AuthProvider>();
    final sid = auth.user?.sid;
    final sessionId = auth.sessionId;
    final cls = auth.user?.cls;
    final token = auth.token;

    if (sid == null || sessionId == null || token == null || cls == null) {
      // Try without cls if cls is null
      if (sid == null || sessionId == null || token == null) {
        setState(() => _isLoading = false);
        return;
      }
    }

    setState(() => _isLoading = true);

    try {
      final attendance = await ParentService.fetchStudentAttendance(
        token: token,
        sessionId: sessionId,
        cls: cls ?? '',
        sid: sid,
      );

      setState(() => _attendance = attendance);
    } catch (e) {
      debugPrint('Error loading attendance: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.white));
    }

    final presentCount = _attendance.where((item) => item['status'] == 'P').length;
    final attendanceRate = _attendance.isNotEmpty
        ? ((presentCount / _attendance.length) * 100).toStringAsFixed(2)
        : '0.00';

    return RefreshIndicator(
      onRefresh: _loadAttendance,
      backgroundColor: const Color(0xFF1E293B),
      color: Colors.white,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats Card
            Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _StatItem(
                    label: 'Total Days',
                    value: _attendance.length.toString(),
                    color: const Color(0xFF3B82F6),
                  ),
                  _StatItem(
                    label: 'Present',
                    value: presentCount.toString(),
                    color: const Color(0xFF10B981),
                  ),
                  _StatItem(
                    label: 'Attendance',
                    value: '$attendanceRate%',
                    color: const Color(0xFFEF4444),
                  ),
                ],
              ),
            ),

            // Attendance List
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Attendance Records',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 16),

            if (_attendance.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Text(
                    'No attendance records available',
                    style: GoogleFonts.poppins(color: Colors.white70),
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _attendance.length,
                itemBuilder: (context, index) {
                  final item = _attendance[index];
                  final status = item['status'];
                  final isPresent = status == 'P';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Iconsax.calendar,
                              color: Colors.white70,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              DateFormat('dd MMM yyyy').format(DateTime.parse(item['date'])),
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          decoration: BoxDecoration(
                            color: isPresent
                                ? const Color(0xFF10B981).withOpacity(0.2)
                                : const Color(0xFFEF4444).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isPresent ? 'Present' : 'Absent',
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isPresent ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: Colors.white70,
          ),
        ),
      ],
    );
  }
}
