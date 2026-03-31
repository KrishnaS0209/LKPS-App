class ApiConfig {
  static const String prodApiRoot = 'https://lkps-app.onrender.com';
  static const String devApiRoot = 'http://localhost:5001';
  
  static const bool isDevelopment = false; // Set to true for local development
  
  static String get apiRoot => isDevelopment ? devApiRoot : prodApiRoot;
  static String get apiBase => '$apiRoot/api';
}
