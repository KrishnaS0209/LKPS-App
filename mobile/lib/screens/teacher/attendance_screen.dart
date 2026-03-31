import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/teacher_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  List<String> _classes = [];
  String? _selectedClass;
  List<dynamic> _students = [];
  Map<String, String> _attendance = {};
  final String _date = DateFormat('yyyy-MM-dd').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  Future<void> _loadClasses() async {
    final auth = context.read<AuthProvider>();
    if (auth.token == null || auth.sessionId == null) return;

    setState(() => _isLoading = true);

    try {
      final sessionData = await TeacherService.fetchSessionData(
        token: auth.token!,
        sessionId: auth.sessionId!,
      );

      final classes = List<String>.from(sessionData['classes'] ?? []);
      setState(() {
        _classes = classes;
        if (classes.isNotEmpty) {
          _selectedClass = classes.first;
        }
      });

      if (_selectedClass != null) {
        await _loadStudents();
      }
    } catch (e) {
      debugPrint('Error loading classes: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadStudents() async {
    if (_selectedClass == null) return;

    final auth = context.read<AuthProvider>();
    if (auth.token == null || auth.sessionId == null) return;

    setState(() => _isLoading = true);

    try {
      final students = await TeacherService.fetchClassStudents(
        token: auth.token!,
        sessionId: auth.sessionId!,
        cls: _selectedClass!,
      );

      final attendanceData = await TeacherService.fetchAttendance(
        token: auth.token!,
        sessionId: auth.sessionId!,
        cls: _selectedClass!,
        date: _date,
      );

      setState(() {
        _students = students;
        _attendance = Map<String, String>.from(attendanceData[_date] ?? {});
      });
    } catch (e) {
      debugPrint('Error loading students: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _toggleAttendance(String sid, String status) {
    setState(() {
      if (_attendance[sid] == status) {
        _attendance.remove(sid);
      } else {
        _attendance[sid] = status;
      }
    });
  }

  Future<void> _saveAttendance() async {
    final auth = context.read<AuthProvider>();
    if (auth.token == null || auth.sessionId == null || _selectedClass == null) return;

    setState(() => _isSaving = true);

    try {
      await TeacherService.saveAttendance(
        token: auth.token!,
        sessionId: auth.sessionId!,
        date: _date,
        cls: _selectedClass!,
        records: _attendance,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Attendance saved successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'MARK ATTENDANCE',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF3B82F6),
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                DateFormat('EEEE, MMMM d, y').format(DateTime.now()),
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
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
                      'Select Class',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _classes.map((cls) {
                        final isSelected = _selectedClass == cls;
                        return GestureDetector(
                          onTap: () {
                            setState(() => _selectedClass = cls);
                            _loadStudents();
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFFCBD5E1),
                              ),
                            ),
                            child: Text(
                              cls,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (_students.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Center(
                    child: Text(
                      'No students found in this class.',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  ),
                )
              else ...[
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
                      Text(
                        'Students (${_students.length})',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ..._students.map((student) {
                        final sid = student['sid'];
                        final status = _attendance[sid];
                        final name = [student['fn'], student['ln']]
                            .where((e) => e != null && e.toString().isNotEmpty)
                            .join(' ');

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Roll: ${student['roll']}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: ['P', 'A', 'L'].map((s) {
                                  final isSelected = status == s;
                                  final color = s == 'P'
                                      ? const Color(0xFF10B981)
                                      : s == 'A'
                                          ? const Color(0xFFEF4444)
                                          : const Color(0xFFF59E0B);

                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 4),
                                      child: GestureDetector(
                                        onTap: () => _toggleAttendance(sid, s),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 10),
                                          decoration: BoxDecoration(
                                            color: isSelected ? color : Colors.white,
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: isSelected ? color : const Color(0xFFCBD5E1),
                                            ),
                                          ),
                                          child: Text(
                                            s == 'P' ? 'Present' : s == 'A' ? 'Absent' : 'Leave',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: isSelected ? Colors.white : const Color(0xFF64748B),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _saveAttendance,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFBBF24),
                      foregroundColor: const Color(0xFF0F172A),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text(
                            'Save Attendance',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
