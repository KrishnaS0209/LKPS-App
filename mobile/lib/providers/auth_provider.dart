import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  String? _token;
  String? _role;
  String? _sessionId;
  UserModel? _user;
  bool _isLoading = true;

  String? get token => _token;
  String? get role => _role;
  String? get sessionId => _sessionId;
  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null;

  Future<void> loadSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final sessionData = prefs.getString('session');
      
      if (sessionData != null) {
        final data = jsonDecode(sessionData);
        _token = data['token'];
        _role = data['role'];
        _sessionId = data['sessionId'];
        _user = UserModel.fromJson(data['user'] ?? {});
      }
    } catch (e) {
      debugPrint('Error loading session: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> signIn({
    required String role,
    required String username,
    required String password,
    String? sessionId,
  }) async {
    try {
      Map<String, dynamic> result;

      if (role == 'teacher') {
        if (sessionId == null) throw Exception('Session ID required for teacher login');
        result = await AuthService.loginTeacher(
          username: username,
          password: password,
          sessionId: sessionId,
        );
        _sessionId = sessionId;
        _user = UserModel.fromJson(result['teacher'] ?? {});
      } else {
        result = await AuthService.loginParent(
          username: username,
          password: password,
        );
        _sessionId = result['student']?['sessionId'];
        _user = UserModel.fromJson(result['student'] ?? {});
      }

      _token = result['token'];
      _role = role;

      await _saveSession();
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> signOut() async {
    _token = null;
    _role = null;
    _sessionId = null;
    _user = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('session');
    
    notifyListeners();
  }

  Future<void> _saveSession() async {
    final prefs = await SharedPreferences.getInstance();
    final sessionData = jsonEncode({
      'token': _token,
      'role': _role,
      'sessionId': _sessionId,
      'user': _user?.toJson(),
    });
    await prefs.setString('session', sessionData);
  }
}
