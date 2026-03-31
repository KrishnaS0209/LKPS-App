# LKPS Mobile - Setup Guide

## What's New

The mobile app has been completely redesigned using **Flutter & Dart** with:

✅ Modern, clean UI design  
✅ Real-time data connectivity with the backend  
✅ Focused on Teacher and Parent roles only  
✅ Pull-to-refresh functionality  
✅ Offline session persistence  
✅ Professional color scheme and typography  

## Quick Start

### 1. Install Flutter

If you don't have Flutter installed:

**macOS:**
```bash
brew install flutter
```

Or download from: https://docs.flutter.dev/get-started/install

### 2. Verify Installation

```bash
flutter doctor
```

This will check if you have all required dependencies.

### 3. Install Dependencies

```bash
cd mobile
flutter pub get
```

### 4. Configure API

Edit `lib/config/api_config.dart`:

For **local development**:
```dart
static const bool isDevelopment = true;
static const String devApiRoot = 'http://YOUR_LOCAL_IP:5001';
```

For **production**:
```dart
static const bool isDevelopment = false;
```

### 5. Run the App

**On Android Emulator:**
```bash
flutter run
```

**On iOS Simulator:**
```bash
flutter run
```

**On Physical Device:**
```bash
flutter run -d <device-id>
```

List devices: `flutter devices`

## App Features

### Teacher Portal (Blue Theme)

1. **Dashboard Tab**
   - View assigned classes
   - See student count
   - Check messages
   - Read school notices

2. **Attendance Tab**
   - Select class
   - Mark attendance (Present/Absent/Leave)
   - Save to server
   - Date-based tracking

3. **Settings Tab**
   - View profile
   - Sign out

### Parent Portal (Purple Theme)

1. **Dashboard Tab**
   - Student information
   - Attendance rate
   - Recent attendance history
   - School notices

2. **Fees Tab**
   - Fee summary
   - Payment history
   - Balance due
   - Payment status

3. **Settings Tab**
   - View profile
   - Sign out

## Login Credentials

### Teacher Login
- Username: (teacher username)
- Password: (teacher password)
- Session: Select from available sessions

### Parent Login
- Username: (parent username - usually student ID)
- Password: (parent password)

## Architecture

```
Flutter App (Dart)
    ↓
Provider (State Management)
    ↓
Services (API Layer)
    ↓
HTTP Requests
    ↓
Backend Server (Node.js/Express)
    ↓
MongoDB Database
```

## Key Technologies

- **Flutter**: Cross-platform mobile framework
- **Provider**: State management
- **HTTP**: API communication
- **SharedPreferences**: Local storage
- **Intl**: Date/number formatting

## Development Tips

### Hot Reload
Press `r` in the terminal while the app is running to hot reload changes.

### Hot Restart
Press `R` to hot restart the app.

### Debug Mode
The app runs in debug mode by default with helpful error messages.

### Build for Release

**Android APK:**
```bash
flutter build apk --release
```

**iOS:**
```bash
flutter build ios --release
```

## Troubleshooting

### "Flutter not found"
Add Flutter to your PATH or reinstall Flutter.

### "No devices found"
Start an emulator or connect a physical device with USB debugging enabled.

### "API connection failed"
- Check if the backend server is running
- Verify the API URL in `api_config.dart`
- For physical devices, use your computer's LAN IP, not localhost

### "Dependencies error"
```bash
flutter clean
flutter pub get
```

## File Structure

```
mobile/
├── lib/
│   ├── config/          # Configuration files
│   ├── models/          # Data models
│   ├── providers/       # State management
│   ├── services/        # API services
│   ├── screens/         # UI screens
│   ├── widgets/         # Reusable widgets
│   └── main.dart        # Entry point
├── android/             # Android-specific files
├── ios/                 # iOS-specific files
├── pubspec.yaml         # Dependencies
└── README.md            # Documentation
```

## Next Steps

1. Test the app on both Android and iOS
2. Customize colors in the theme
3. Add more features (exams, timetable, etc.)
4. Implement push notifications
5. Add offline mode capabilities
6. Create app icons and splash screens

## Support

For issues or questions:
1. Check Flutter documentation: https://docs.flutter.dev
2. Review the backend API documentation
3. Check server logs for API errors

---

**Built with Flutter 💙**
