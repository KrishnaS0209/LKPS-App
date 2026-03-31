import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/parent_service.dart';

class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key});

  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  bool _isLoading = true;
  List<dynamic> _notices = [];

  @override
  void initState() {
    super.initState();
    _loadNotices();
  }

  Future<void> _loadNotices() async {
    setState(() => _isLoading = true);

    try {
      final notices = await ParentService.fetchPublicNotices();
      setState(() => _notices = notices);
    } catch (e) {
      debugPrint('Error loading notices: $e');
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

    if (_notices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
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
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotices,
      backgroundColor: const Color(0xFF1E293B),
      color: Colors.white,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: _notices.length,
        itemBuilder: (context, index) {
          final notice = _notices[index];
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
        },
      ),
    );
  }
}
