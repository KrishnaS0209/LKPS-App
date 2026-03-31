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
    final attendance = await ApiService.request(
      '/sessions/$sessionId/attendance?cls=$cls',
      token: token,
    );

    final List<Map<String, dynamic>> days = [];
    
    attendance.forEach((date, records) {
      if (records is Map && records.containsKey(sid)) {
        days.add({
          'date': date,
          'status': records[sid],
        });
      }
    });

    days.sort((a, b) => b['date'].compareTo(a['date']));
    return days;
  }

  static Future<List<dynamic>> fetchPublicNotices() async {
    return await ApiService.requestList('/notices/public');
  }
}
