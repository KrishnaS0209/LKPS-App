import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiService {
  static Future<Map<String, dynamic>> request(
    String path, {
    String method = 'GET',
    Map<String, String>? headers,
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final url = Uri.parse('${ApiConfig.apiBase}$path');
    final defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      ...?headers,
    };

    http.Response response;

    switch (method.toUpperCase()) {
      case 'POST':
        response = await http.post(
          url,
          headers: defaultHeaders,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PATCH':
        response = await http.patch(
          url,
          headers: defaultHeaders,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'DELETE':
        response = await http.delete(url, headers: defaultHeaders);
        break;
      default:
        response = await http.get(url, headers: defaultHeaders);
    }

    final data = jsonDecode(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data is Map<String, dynamic> ? data : {'data': data};
    } else {
      throw Exception(data['error'] ?? 'Request failed');
    }
  }

  static Future<List<dynamic>> requestList(
    String path, {
    String? token,
  }) async {
    final url = Uri.parse('${ApiConfig.apiBase}$path');
    final headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final response = await http.get(url, headers: headers);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data is List ? data : [];
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Request failed');
    }
  }
}
