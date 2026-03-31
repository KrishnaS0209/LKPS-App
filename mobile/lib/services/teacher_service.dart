import 'api_service.dart';

class TeacherService {
  static Future<Map<String, dynamic>> fetchSessionData({
    required String token,
    required String sessionId,
  }) async {
    return await ApiService.request(
      '/sessions/$sessionId/session-data',
      token: token,
    );
  }

  static Future<List<dynamic>> fetchClassStudents({
    required String token,
    required String sessionId,
    required String cls,
  }) async {
    final students = await ApiService.requestList(
      '/sessions/$sessionId/students',
      token: token,
    );
    return students.where((s) => s['cls'] == cls).toList();
  }

  static Future<Map<String, dynamic>> fetchAttendance({
    required String token,
    required String sessionId,
    required String cls,
    String? date,
  }) async {
    final query = date != null ? '?cls=$cls&date=$date' : '?cls=$cls';
    return await ApiService.request(
      '/sessions/$sessionId/attendance$query',
      token: token,
    );
  }

  static Future<Map<String, dynamic>> saveAttendance({
    required String token,
    required String sessionId,
    required String date,
    required String cls,
    required Map<String, String> records,
  }) async {
    return await ApiService.request(
      '/sessions/$sessionId/attendance',
      method: 'POST',
      token: token,
      body: {
        'date': date,
        'cls': cls,
        'records': records,
      },
    );
  }

  static Future<List<dynamic>> fetchMessages({
    required String token,
    required String sessionId,
  }) async {
    return await ApiService.requestList(
      '/sessions/$sessionId/messages',
      token: token,
    );
  }
}
