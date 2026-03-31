import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import '../../providers/auth_provider.dart';
import '../../services/parent_service.dart';

const _teal = Color(0xFF14B8A6);
const _cyan = Color(0xFF06B6D4);
const _bg = Color(0xFF111827);
const _card = Color(0xFF1F2937);

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _student;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final auth = context.read<AuthProvider>();
    final sid = auth.user?.sid;
    final sessionId = auth.sessionId;
    final token = auth.token;
    if (sid == null || sessionId == null || token == null) {
      setState(() => _isLoading = false);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final student = await ParentService.fetchStudentRecord(
        token: token, sessionId: sessionId, sid: sid);
      setState(() => _student = student);
    } catch (e) {
      debugPrint('Error loading profile: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  ImageProvider? _getPhoto(dynamic photo) {
    if (photo == null || photo.toString().isEmpty) return null;
    final str = photo.toString();
    try {
      if (str.startsWith('data:')) return MemoryImage(base64Decode(str.split(',').last));
      return MemoryImage(base64Decode(str));
    } catch (_) {
      return NetworkImage(str);
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

    final fn = _student?['fn'] ?? '';
    final ln = _student?['ln'] ?? '';
    final fullName = [fn, ln].where((e) => e.isNotEmpty).join(' ');

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfile,
          color: _teal,
          backgroundColor: _card,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              children: [
                // ── Profile Header ───────────────────────────────────
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  decoration: BoxDecoration(
                    color: _card,
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(28),
                      bottomRight: Radius.circular(28),
                    ),
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 48,
                        backgroundColor: _teal.withOpacity(0.2),
                        backgroundImage: _getPhoto(_student?['photo']),
                        child: _student?['photo'] == null || (_student!['photo'] as String).isEmpty
                            ? Text(
                                fullName.isNotEmpty ? fullName[0].toUpperCase() : 'S',
                                style: GoogleFonts.poppins(
                                  fontSize: 36, fontWeight: FontWeight.w700, color: _teal),
                              )
                            : null,
                      ),
                      const SizedBox(height: 16),
                      Text(fullName,
                        style: GoogleFonts.poppins(
                          fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
                      const SizedBox(height: 6),
                      Text(
                        'Class ${_student?['cls'] ?? 'N/A'}  •  Roll No. ${_student?['roll'] ?? 'N/A'}',
                        style: GoogleFonts.poppins(fontSize: 14, color: _teal)),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // ── Academic Info ────────────────────────────────────
                _Section(
                  title: 'Academic Details',
                  icon: Iconsax.book_1,
                  children: [
                    _InfoRow(label: 'Class', value: _student?['cls'] ?? 'N/A'),
                    _InfoRow(label: 'Roll Number', value: _student?['roll'] ?? 'N/A'),
                    _InfoRow(label: 'Admission No.', value: _student?['admno'] ?? _student?['an'] ?? 'N/A'),
                    _InfoRow(label: 'Admission Date', value: _student?['admdate'] ?? _student?['ad'] ?? 'N/A'),
                    _InfoRow(label: 'Fee Status', value: _student?['fst'] ?? 'N/A',
                      valueColor: _student?['fst'] == 'Paid' ? const Color(0xFF22C55E) : const Color(0xFFEF4444)),
                  ],
                ),

                const SizedBox(height: 16),

                // ── Personal Info ────────────────────────────────────
                _Section(
                  title: 'Personal Details',
                  icon: Iconsax.user,
                  children: [
                    _InfoRow(label: 'Date of Birth', value: _student?['dob'] ?? 'N/A'),
                    _InfoRow(label: 'Gender', value: _student?['gn'] ?? 'N/A'),
                    _InfoRow(label: 'Blood Group', value: _student?['blood'] ?? _student?['bl'] ?? 'N/A'),
                    _InfoRow(label: 'Caste', value: _student?['caste'] ?? _student?['ca'] ?? 'N/A'),
                    _InfoRow(label: 'Aadhaar', value: _student?['aadhar'] ?? _student?['aa'] ?? 'N/A'),
                  ],
                ),

                const SizedBox(height: 16),

                // ── Parent Info ──────────────────────────────────────
                _Section(
                  title: 'Parent Details',
                  icon: Iconsax.profile_2user,
                  children: [
                    _InfoRow(label: "Father's Name", value: _student?['father'] ?? _student?['fa'] ?? 'N/A'),
                    _InfoRow(label: "Father's Phone", value: _student?['fphone'] ?? _student?['fp'] ?? 'N/A'),
                    _InfoRow(label: "Mother's Name", value: _student?['mother'] ?? _student?['ma'] ?? 'N/A'),
                    _InfoRow(label: "Mother's Phone", value: _student?['mphone'] ?? _student?['mp'] ?? 'N/A'),
                    _InfoRow(label: 'Phone / WhatsApp', value: _student?['ph'] ?? 'N/A'),
                  ],
                ),

                const SizedBox(height: 16),

                // ── Address ──────────────────────────────────────────
                _Section(
                  title: 'Address',
                  icon: Iconsax.location,
                  children: [
                    _InfoRow(label: 'Address', value: _student?['addr'] ?? 'N/A'),
                    _InfoRow(label: 'City', value: _student?['city'] ?? _student?['cy'] ?? 'N/A'),
                    _InfoRow(label: 'PIN Code', value: _student?['pin'] ?? 'N/A'),
                  ],
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _Section({required this.title, required this.icon, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(icon, color: _teal, size: 20),
                const SizedBox(width: 10),
                Text(title,
                  style: GoogleFonts.poppins(
                    fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
              ],
            ),
          ),
          const Divider(color: Color(0xFF374151), height: 1),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFF374151), width: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
            style: GoogleFonts.poppins(fontSize: 13, color: Colors.white54)),
          const SizedBox(width: 16),
          Flexible(
            child: Text(value,
              textAlign: TextAlign.right,
              style: GoogleFonts.poppins(
                fontSize: 13, fontWeight: FontWeight.w600,
                color: valueColor ?? Colors.white)),
          ),
        ],
      ),
    );
  }
}
