import 'package:flutter/foundation.dart';
import 'api_service.dart';

class ParentService {
  static Future<Map<String, dynamic>?> fetchStudentRecord({
    required String token,
    required String sessionId,
    required String sid,
  }) async {
    final students = await ApiService.requestList(
      '/sessions/$sessionId/students',
      token: token,
    );
    
    try {
      return students.firstWhere(
        (s) => s['sid'] == sid,
        orElse: () => null,
      );
    } catch (e) {
      return null;
    }
  }

  static Future<List<dynamic>> fetchStudentPayments({
    required String token,
    required String sessionId,
    required String sid,
  }) async {
    return await ApiService.requestList(
      '/sessions/$sessionId/payments?sid=$sid',
      token: token,
    );
  }

  static Future<List<Map<String, dynamic>>> fetchStudentAttendance({
    required String token,
    required String sessionId,
    required String cls,
    required String sid,
  }) async {
    try {
      // Fetch all attendance without cls filter first
      final attendance = await ApiService.request(
        '/sessions/$sessionId/attendance',
        token: token,
      );

      debugPrint('Attendance raw keys: ${attendance.keys.take(3).toList()}');

      final List<Map<String, dynamic>> days = [];

      attendance.forEach((date, records) {
        if (records is! Map) return;

        // Try direct sid lookup
        if (records.containsKey(sid)) {
          days.add({'date': date, 'status': records[sid]});
          return;
        }

        // Try nested structure: { cls: { sid: status } }
        records.forEach((key, value) {
          if (value is Map && value.containsKey(sid)) {
            days.add({'date': date, 'status': value[sid]});
          }
        });
      });

      debugPrint('Attendance days found for $sid: ${days.length}');
      days.sort((a, b) => b['date'].compareTo(a['date']));
      return days;
    } catch (e) {
      debugPrint('Error fetching attendance: $e');
      return [];
    }
  }

  static Future<List<dynamic>> fetchPublicNotices() async {
    return await ApiService.requestList('/notices/public');
  }
}
