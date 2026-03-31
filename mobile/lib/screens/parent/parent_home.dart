import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import 'parent_dashboard.dart';
import 'attendance_screen.dart';
import 'fees_screen.dart';
import 'alerts_screen.dart';
import 'result_screen.dart';
import 'profile_screen.dart';

class ParentHome extends StatefulWidget {
  const ParentHome({super.key});

  @override
  State<ParentHome> createState() => _ParentHomeState();
}

class _ParentHomeState extends State<ParentHome> {
  int _currentIndex = 2;

  void _navigate(int index) => setState(() => _currentIndex = index);

  List<Widget> get _screens => [
    const AlertsScreen(),
    const AttendanceScreen(),
    ParentDashboard(onNavigate: _navigate),
    const ResultScreen(),
    const FeesScreen(),
    const ProfileScreen(),
  ];

  static const _navItems = [
    {'icon': Iconsax.notification, 'label': 'Alerts'},
    {'icon': Iconsax.calendar_1,   'label': 'Attendance'},
    {'icon': Iconsax.home,         'label': 'Dashboard'},
    {'icon': Iconsax.document_text1, 'label': 'Result'},
    {'icon': Iconsax.wallet,       'label': 'Fees'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111827),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: _screens[_currentIndex],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1F2937),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_navItems.length, (i) {
                final isActive = _currentIndex == i;
                final icon = _navItems[i]['icon'] as IconData;
                final label = _navItems[i]['label'] as String;
                return GestureDetector(
                  onTap: () => setState(() => _currentIndex = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeInOut,
                    padding: EdgeInsets.symmetric(
                      horizontal: isActive ? 14 : 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isActive
                          ? const Color(0xFF14B8A6).withOpacity(0.15)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          icon,
                          color: isActive
                              ? const Color(0xFF14B8A6)
                              : Colors.white38,
                          size: 24,
                        ),
                        if (isActive) ...[
                          const SizedBox(width: 6),
                          Text(
                            label,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF14B8A6),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
