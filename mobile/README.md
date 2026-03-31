# LKPS Mobile App

Modern Flutter mobile application for Lord Krishna Public School, designed for teachers and parents with real-time data connectivity.

## Features

### For Teachers
- **Dashboard**: View classes, students, messages, and notices
- **Attendance Management**: Mark daily attendance for classes with intuitive UI
- **Real-time Updates**: Pull-to-refresh for latest data
- **Session Management**: Switch between academic sessions

### For Parents
- **Student Dashboard**: View child's information, attendance rate, and fee status
- **Attendance Tracking**: See detailed attendance history with visual indicators
- **Fee Management**: Track payments, view balance, and payment history
- **School Notices**: Stay updated with school announcements

## Tech Stack

- **Framework**: Flutter 3.10+
- **State Management**: Provider
- **HTTP Client**: http package
- **Local Storage**: shared_preferences
- **Date Formatting**: intl package

## Getting Started

### Prerequisites
- Flutter SDK 3.10.7 or higher
- Dart SDK
- Android Studio / Xcode (for mobile development)

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
flutter pub get
```

3. Configure API endpoint:
Edit `lib/config/api_config.dart` and set your API URL:
```dart
static const bool isDevelopment = true; // For local development
static const String devApiRoot = 'http://YOUR_LOCAL_IP:5001';
```

4. Run the app:
```bash
flutter run
```

## Project Structure

```
lib/
├── config/
│   └── api_config.dart          # API configuration
├── models/
│   └── user_model.dart          # User data model
├── providers/
│   └── auth_provider.dart       # Authentication state management
├── services/
│   ├── api_service.dart         # Base API service
│   ├── auth_service.dart        # Authentication API calls
│   ├── parent_service.dart      # Parent-specific API calls
│   └── teacher_service.dart     # Teacher-specific API calls
├── screens/
│   ├── login_screen.dart        # Login screen
│   ├── parent/
│   │   ├── parent_home.dart     # Parent navigation
│   │   ├── parent_dashboard.dart
│   │   └── fees_screen.dart
│   └── teacher/
│       ├── teacher_home.dart    # Teacher navigation
│       ├── teacher_dashboard.dart
│       ├── attendance_screen.dart
│       └── settings_screen.dart
├── widgets/
│   └── info_card.dart           # Reusable info card widget
└── main.dart                    # App entry point
```

## Design System

### Colors
- **Primary (Teacher)**: Blue (#3B82F6)
- **Primary (Parent)**: Purple (#8B5CF6)
- **Accent**: Amber (#FBBF24)
- **Background**: Slate (#F8FAFC)
- **Text**: Slate (#0F172A)

### Typography
- **Headings**: 900 weight, tight spacing
- **Body**: 400-600 weight
- **Labels**: 700 weight, uppercase, letter-spacing

### Components
- Rounded corners (12-24px)
- Subtle shadows
- Card-based layouts
- Bottom navigation
- Pull-to-refresh

## API Integration

The app connects to the LKPS backend server for:
- Authentication (teacher/parent login)
- Student data
- Attendance records
- Payment history
- School notices
- Session management

## Building for Production

### Android
```bash
flutter build apk --release
```

### iOS
```bash
flutter build ios --release
```

## Testing

Run tests:
```bash
flutter test
```

## Contributing

1. Follow Flutter best practices
2. Use Provider for state management
3. Keep UI components modular
4. Maintain consistent design system
5. Test on both Android and iOS

## License

Private - Lord Krishna Public School
