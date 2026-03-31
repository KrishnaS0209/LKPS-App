import 'api_service.dart';

class AuthService {
  static Future<Map<String, dynamic>> loginTeacher({
    required String username,
    required String password,
    required String sessionId,
  }) async {
    return await ApiService.request(
      '/auth/teacher-login',
      method: 'POST',
      body: {
        'username': username,
        'password': password,
        'sessionId': sessionId,
      },
    );
  }

  static Future<Map<String, dynamic>> loginParent({
    required String username,
    required String password,
  }) async {
    return await ApiService.request(
      '/auth/parent-login',
      method: 'POST',
      body: {
        'username': username,
        'password': password,
      },
    );
  }

  static Future<List<dynamic>> fetchSessions() async {
    return await ApiService.requestList('/sessions');
  }

  static Future<Map<String, dynamic>> fetchCurrentUser(String token) async {
    return await ApiService.request('/auth/me', token: token);
  }
}
