import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import '../config/api_config.dart';

class ApiService {
  static http.Client _getClient() {
    final ioClient = HttpClient()
      ..badCertificateCallback = (_, __, ___) => true;
    return IOClient(ioClient);
  }

  static Future<Map<String, dynamic>> request(
    String path, {
    String method = 'GET',
    Map<String, String>? headers,
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final url = Uri.parse('${ApiConfig.apiBase}$path');
    final h = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      ...?headers,
    };

    final client = _getClient();
    http.Response response;

    try {
      switch (method.toUpperCase()) {
        case 'POST':
          response = await client.post(url, headers: h, body: body != null ? jsonEncode(body) : null);
          break;
        case 'PATCH':
          response = await client.patch(url, headers: h, body: body != null ? jsonEncode(body) : null);
          break;
        case 'DELETE':
          response = await client.delete(url, headers: h);
          break;
        default:
          response = await client.get(url, headers: h);
      }
    } finally {
      client.close();
    }

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data is Map<String, dynamic> ? data : {'data': data};
    }
    throw Exception(data['error'] ?? 'Request failed');
  }

  static Future<List<dynamic>> requestList(String path, {String? token}) async {
    final url = Uri.parse('${ApiConfig.apiBase}$path');
    final h = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final client = _getClient();
    http.Response response;

    try {
      response = await client.get(url, headers: h);
    } finally {
      client.close();
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data is List ? data : [];
    }
    final error = jsonDecode(response.body);
    throw Exception(error['error'] ?? 'Request failed');
  }
}
