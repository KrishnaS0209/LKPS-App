# Implementation Plan: Mobile Parent-Teacher Enhancement

## Overview

This implementation plan converts the feature design into actionable coding tasks for enhancing the LKPS mobile app with comprehensive parent and teacher functionality. The tasks are organized to build incrementally, starting with foundational infrastructure (API libraries, cache layer, reusable components), then implementing parent portal screens, followed by teacher portal screens, and finally integration and testing.

Each task references specific requirements and includes property-based test sub-tasks to validate correctness properties from the design document.

## Tasks

- [ ] 1. Set up cache infrastructure and API library extensions
  - Create cache.js module with AsyncStorage integration
  - Extend parent.js API library with new functions
  - Create teacher.js API library with all teacher operations
  - Set up error handling utilities
  - _Requirements: 15.1, 15.2, 15.7, 16.1, 16.2, 19.1, 19.2, 19.6_

- [ ] 2. Create reusable UI components
  - [ ] 2.1 Create FormInput component with label, error display, and validation
    - Support text input, multiline, and keyboard type props
    - Display inline error messages below input field
    - _Requirements: 2.1, 2.2, 19.4_
  
  - [ ] 2.2 Create StatusBadge component for color-coded status display
    - Support attendance status (Present/Absent/Leave) with color mapping
    - Support fee status and message status variants
    - _Requirements: 3.4, 4.2_
  
  - [ ] 2.3 Create DatePicker component with platform-specific implementation
    - Provide label and value display
    - Handle date selection and onChange callback
    - _Requirements: 8.2, 8.3_
  
  - [ ] 2.4 Create AttendanceToggle component for three-state attendance marking
    - Display student name and roll number
    - Toggle between Present/Absent/Leave states
    - _Requirements: 8.4, 8.5_
  
  - [ ] 2.5 Create EmptyState component for no-data scenarios
    - Display emoji and message
    - _Requirements: 3.5, 5.5, 6.5, 7.6_
  
  - [ ] 2.6 Create ErrorBanner component for error display with retry
    - Display error message prominently
    - Provide optional retry button
    - _Requirements: 19.1, 19.2, 19.3_

- [ ] 3. Implement cache layer (cache.js)
  - [ ] 3.1 Implement getCachedData, setCachedData, clearCachedData functions
    - Use AsyncStorage for persistence
    - Store data with timestamp
    - Handle JSON serialization/deserialization
    - _Requirements: 15.1, 15.2_
  
  - [ ]* 3.2 Write property test for cache round-trip consistency
    - **Property 56: Session Persistence Round Trip**
    - **Validates: Requirements 17.5**
  
  - [ ] 3.3 Implement cache staleness checking (isCacheStale, getCacheTimestamp)
    - Define fresh threshold (5 minutes)
    - Define stale threshold (60 minutes)
    - _Requirements: 15.4_
  
  - [ ]* 3.4 Write unit tests for cache expiration logic
    - Test fresh, stale, and expired cache scenarios
    - _Requirements: 15.4_

- [ ] 4. Extend parent.js API library
  - [ ] 4.1 Implement updateStudentContact function
    - Send PATCH request with contact data
    - Include authentication token
    - Handle response and errors
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [ ] 4.2 Implement fetchStudentExams function
    - Fetch exams for student's class
    - Parse and return exam records
    - _Requirements: 6.1_
  
  - [ ] 4.3 Implement sendMessage and fetchSentMessages functions
    - POST message with student context
    - GET previously sent messages
    - _Requirements: 14.3, 14.6_
  
  - [ ]* 4.4 Write property test for API token inclusion
    - **Property 59: Token Inclusion in API Requests**
    - **Validates: Requirements 18.2**
  
  - [ ]* 4.5 Write property test for contact update API integration
    - **Property 3: Contact Update API Integration**
    - **Validates: Requirements 2.3**

- [ ] 5. Create teacher.js API library
  - [ ] 5.1 Implement teacher class and student fetching functions
    - fetchTeacherClasses: GET classes for teacher
    - fetchClassStudents: GET students in a class
    - _Requirements: 7.1, 7.2_
  
  - [ ] 5.2 Implement attendance operations
    - fetchAttendanceForDate: GET attendance for class and date
    - submitAttendance: POST attendance records
    - fetchAttendanceHistory: GET historical attendance
    - _Requirements: 8.6, 8.9, 9.1_
  
  - [ ] 5.3 Implement exam management operations
    - fetchExams: GET exams for class
    - createExam: POST new exam
    - updateExam: PATCH exam details
    - deleteExam: DELETE exam
    - _Requirements: 11.3, 11.6, 11.8_
  
  - [ ] 5.4 Implement marks operations
    - fetchExamMarks: GET marks for exam
    - submitMarks: PATCH marks data
    - _Requirements: 10.7, 10.10_
  
  - [ ] 5.5 Implement fetchTimetable function
    - GET timetable for teacher and week
    - _Requirements: 12.1, 12.6_
  
  - [ ]* 5.6 Write property test for attendance submission API integration
    - **Property 24: Attendance Submission API Integration**
    - **Validates: Requirements 8.6**
  
  - [ ]* 5.7 Write property test for marks submission API integration
    - **Property 31: Marks Submission API Integration**
    - **Validates: Requirements 10.7**

- [ ] 6. Implement validation utilities
  - [ ] 6.1 Create phone number validation function
    - Validate 10 digits, numeric only
    - Return validation result and error message
    - _Requirements: 2.6_
  
  - [ ]* 6.2 Write property test for phone number validation
    - **Property 4: Phone Number Validation**
    - **Validates: Requirements 2.6**
  
  - [ ] 6.3 Create contact form validation function
    - Validate all phone number fields
    - Return validation errors object
    - _Requirements: 2.6_
  
  - [ ] 6.4 Create marks validation functions
    - Validate non-negative marks
    - Validate marks not exceeding maximum
    - _Requirements: 10.5, 10.6_
  
  - [ ]* 6.5 Write property test for marks maximum validation
    - **Property 29: Marks Maximum Validation**
    - **Validates: Requirements 10.5**
  
  - [ ]* 6.6 Write property test for marks non-negative validation
    - **Property 30: Marks Non-Negative Validation**
    - **Validates: Requirements 10.6**
  
  - [ ] 6.7 Create exam creation validation function
    - Validate all required fields present
    - _Requirements: 11.2_
  
  - [ ]* 6.8 Write property test for exam creation validation
    - **Property 33: Exam Creation Validation**
    - **Validates: Requirements 11.2**
  
  - [ ] 6.9 Create message validation function
    - Validate subject and body present
    - _Requirements: 14.2_
  
  - [ ]* 6.10 Write property test for message validation
    - **Property 39: Message Validation**
    - **Validates: Requirements 14.2**

- [ ] 7. Checkpoint - Ensure all infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Parent Portal: StudentInfoScreen
  - [ ] 8.1 Create StudentInfoScreen with student information display
    - Display all required fields (name, class, roll, DOB, gender, blood group, parents, contact, address)
    - Fetch student record using fetchStudentRecord
    - Implement pull-to-refresh
    - Show loading and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [ ]* 8.2 Write property test for student information display completeness
    - **Property 1: Student Information Display Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [ ] 8.3 Add editable contact form to StudentInfoScreen
    - Provide FormInput components for phone numbers, address, city
    - Implement form state management
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 8.4 Write property test for contact form editability
    - **Property 2: Contact Form Editability**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ] 8.5 Implement contact update submission
    - Validate form data using validateContactForm
    - Call updateStudentContact on submit
    - Display success/error feedback
    - Update cache on success
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 16.2_
  
  - [ ]* 8.6 Write unit tests for StudentInfoScreen
    - Test error display when data fails to load
    - Test form submission success and error scenarios
    - Test validation error display
    - _Requirements: 1.6, 2.5, 19.4_

- [ ] 9. Implement Parent Portal: AttendanceScreen
  - [ ] 9.1 Create AttendanceScreen with attendance list display
    - Fetch attendance using fetchStudentAttendance
    - Display date and status for each record
    - Sort by date descending
    - Apply color coding (green/red/amber)
    - Calculate and display attendance percentage
    - Implement pull-to-refresh
    - Show empty state when no records
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 9.2 Write property test for attendance record display
    - **Property 5: Attendance Record Display**
    - **Validates: Requirements 3.1**
  
  - [ ]* 9.3 Write property test for attendance date sorting
    - **Property 6: Attendance Date Sorting**
    - **Validates: Requirements 3.2**
  
  - [ ]* 9.4 Write property test for attendance percentage calculation
    - **Property 7: Attendance Percentage Calculation**
    - **Validates: Requirements 3.3**
  
  - [ ]* 9.5 Write property test for attendance status color mapping
    - **Property 8: Attendance Status Color Mapping**
    - **Validates: Requirements 3.4**
  
  - [ ]* 9.6 Write unit tests for AttendanceScreen
    - Test empty state display
    - Test pull-to-refresh functionality
    - _Requirements: 3.5, 3.6_

- [ ] 10. Implement Parent Portal: FeesScreen
  - [ ] 10.1 Create FeesScreen with fee information display
    - Display annual fee, fee status, total paid, remaining balance
    - Fetch payments using fetchStudentPayments
    - Display payment list with amount, date, mode, receipt number
    - Format currency in Indian Rupee format
    - Show empty state when no payments
    - Implement pull-to-refresh
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 10.2 Write property test for fee information display completeness
    - **Property 9: Fee Information Display Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [ ]* 10.3 Write property test for payment total calculation
    - **Property 10: Payment Total Calculation**
    - **Validates: Requirements 4.4**
  
  - [ ]* 10.4 Write property test for fee balance calculation
    - **Property 11: Fee Balance Calculation**
    - **Validates: Requirements 4.5**
  
  - [ ]* 10.5 Write property test for currency formatting
    - **Property 12: Currency Formatting**
    - **Validates: Requirements 4.6**
  
  - [ ]* 10.6 Write unit tests for FeesScreen
    - Test empty state display
    - Test pull-to-refresh functionality
    - _Requirements: 4.7_

- [ ] 11. Implement Parent Portal: ExamsScreen
  - [ ] 11.1 Create ExamsScreen with exam list display
    - Fetch exams using fetchStudentExams
    - Display exam name, subject, date, max marks, obtained marks
    - Calculate and display percentage
    - Sort by date descending
    - Show "Not Available" when marks not entered
    - Implement pull-to-refresh
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 11.2 Write property test for exam information display
    - **Property 16: Exam Information Display**
    - **Validates: Requirements 6.2, 6.3**
  
  - [ ]* 11.3 Write property test for exam percentage calculation
    - **Property 17: Exam Percentage Calculation**
    - **Validates: Requirements 6.4**
  
  - [ ]* 11.4 Write property test for exam date sorting
    - **Property 18: Exam Date Sorting**
    - **Validates: Requirements 6.6**
  
  - [ ]* 11.5 Write unit tests for ExamsScreen
    - Test "Not Available" display for missing marks
    - Test pull-to-refresh functionality
    - _Requirements: 6.5_

- [ ] 12. Implement Parent Portal: NoticesScreen
  - [ ] 12.1 Create NoticesScreen with notice list display
    - Fetch notices using fetchPublicNotices
    - Display title, body, tag for each notice
    - Sort by pinned status first, then by date descending
    - Implement pull-to-refresh
    - Show empty state when no notices
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 12.2 Write property test for notice field display
    - **Property 13: Notice Field Display**
    - **Validates: Requirements 5.2**
  
  - [ ]* 12.3 Write property test for notice pinned priority sorting
    - **Property 14: Notice Pinned Priority Sorting**
    - **Validates: Requirements 5.3**
  
  - [ ]* 12.4 Write property test for notice date sorting
    - **Property 15: Notice Date Sorting**
    - **Validates: Requirements 5.4**
  
  - [ ]* 12.5 Write unit tests for NoticesScreen
    - Test empty state display
    - Test pull-to-refresh functionality
    - _Requirements: 5.5, 5.6_

- [ ] 13. Implement Parent Portal: MessagesScreen
  - [ ] 13.1 Create MessagesScreen with message composition form
    - Provide FormInput for subject and body
    - Validate required fields
    - Call sendMessage on submit
    - Display success/error feedback
    - Clear form on success
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 13.2 Add sent messages list to MessagesScreen
    - Fetch sent messages using fetchSentMessages
    - Display message with status (unread/read/resolved)
    - _Requirements: 14.6, 14.7_
  
  - [ ]* 13.3 Write property test for message submission API integration
    - **Property 40: Message Submission API Integration**
    - **Validates: Requirements 14.3**
  
  - [ ]* 13.4 Write property test for message status display
    - **Property 41: Message Status Display**
    - **Validates: Requirements 14.7**
  
  - [ ]* 13.5 Write unit tests for MessagesScreen
    - Test form validation errors
    - Test success message display
    - Test form clearing after success
    - _Requirements: 14.2, 14.4, 14.5_

- [ ] 14. Checkpoint - Ensure parent portal tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create SessionContext for teacher session management
  - [ ] 15.1 Implement SessionContext provider
    - Manage selectedSession state
    - Provide availableSessions list
    - Persist selection to AsyncStorage
    - Load persisted selection on mount
    - _Requirements: 17.1, 17.2, 17.4, 17.5, 17.6_
  
  - [ ]* 15.2 Write property test for default session selection
    - **Property 54: Default Session Selection**
    - **Validates: Requirements 17.2**
  
  - [ ]* 15.3 Write property test for session switch data reload
    - **Property 55: Session Switch Data Reload**
    - **Validates: Requirements 17.4**
  
  - [ ]* 15.4 Write unit tests for SessionContext
    - Test session persistence and loading
    - Test session display in UI
    - _Requirements: 17.5, 17.6_

- [ ] 16. Implement Teacher Portal: ClassListScreen
  - [ ] 16.1 Create ClassListScreen with class selection
    - Fetch teacher classes using fetchTeacherClasses
    - Display list of assigned classes
    - _Requirements: 7.1_
  
  - [ ] 16.2 Add student list view to ClassListScreen
    - Fetch students using fetchClassStudents when class selected
    - Display name, roll number, admission number
    - Sort by roll number ascending
    - Implement pull-to-refresh
    - Show empty state when no students
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 16.3 Write property test for teacher class display
    - **Property 19: Teacher Class Display**
    - **Validates: Requirements 7.1**
  
  - [ ]* 16.4 Write property test for class student display
    - **Property 20: Class Student Display**
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ]* 16.5 Write property test for student roll number sorting
    - **Property 21: Student Roll Number Sorting**
    - **Validates: Requirements 7.4**
  
  - [ ]* 16.6 Write unit tests for ClassListScreen
    - Test empty state display
    - Test pull-to-refresh functionality
    - _Requirements: 7.5, 7.6_

- [ ] 17. Implement Teacher Portal: MarkAttendanceScreen
  - [ ] 17.1 Create MarkAttendanceScreen with date picker and student list
    - Default date to current date
    - Provide DatePicker component for date selection
    - Fetch students using fetchClassStudents
    - Display AttendanceToggle for each student
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 17.2 Write property test for attendance date default
    - **Property 22: Attendance Date Default**
    - **Validates: Requirements 8.2**
  
  - [ ]* 17.3 Write property test for attendance student completeness
    - **Property 23: Attendance Student Completeness**
    - **Validates: Requirements 8.4**
  
  - [ ] 17.4 Implement attendance submission
    - Validate all students have status
    - Call submitAttendance on submit
    - Display success/error feedback
    - Invalidate attendance cache on success
    - _Requirements: 8.6, 8.7, 8.8, 16.2_
  
  - [ ] 17.5 Implement existing attendance loading
    - Fetch attendance using fetchAttendanceForDate on mount
    - Pre-populate AttendanceToggle components with existing status
    - _Requirements: 8.9_
  
  - [ ]* 17.6 Write property test for existing attendance loading
    - **Property 25: Existing Attendance Loading**
    - **Validates: Requirements 8.9**
  
  - [ ]* 17.7 Write unit tests for MarkAttendanceScreen
    - Test submission success and error scenarios
    - Test loading existing attendance
    - _Requirements: 8.7, 8.8, 8.9_

- [ ] 18. Implement Teacher Portal: AttendanceHistoryScreen
  - [ ] 18.1 Create AttendanceHistoryScreen with date-grouped attendance
    - Fetch attendance history using fetchAttendanceHistory
    - Group records by date
    - Sort by date descending
    - Display summary counts (Present/Absent/Leave) for each date
    - Implement pull-to-refresh
    - _Requirements: 9.1, 9.2, 9.3, 9.6_
  
  - [ ]* 18.2 Write property test for attendance history date grouping
    - **Property 26: Attendance History Date Grouping**
    - **Validates: Requirements 9.2**
  
  - [ ]* 18.3 Write property test for attendance summary calculation
    - **Property 27: Attendance Summary Calculation**
    - **Validates: Requirements 9.3**
  
  - [ ] 18.2 Add detailed view and editing capability
    - Display detailed attendance when date selected
    - Allow editing past attendance
    - Navigate to MarkAttendanceScreen with pre-selected date
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 18.5 Write unit tests for AttendanceHistoryScreen
    - Test date selection and detail view
    - Test pull-to-refresh functionality
    - _Requirements: 9.4, 9.6_

- [ ] 19. Implement Teacher Portal: ExamsManagementScreen
  - [ ] 19.1 Create ExamsManagementScreen with exam list display
    - Fetch exams using fetchExams
    - Display exam name, class, subject, date, max marks
    - Implement pull-to-refresh
    - _Requirements: 10.1, 11.1_
  
  - [ ] 19.2 Add exam creation form to ExamsManagementScreen
    - Provide FormInput for exam ID, name, class, subject, date, max marks
    - Validate required fields using validateExamForm
    - Call createExam on submit
    - Display success/error feedback
    - Add exam to list on success
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.9_
  
  - [ ]* 19.3 Write property test for exam creation API integration
    - **Property 34: Exam Creation API Integration**
    - **Validates: Requirements 11.3**
  
  - [ ] 19.4 Add exam editing capability
    - Provide edit form for name, date, max marks
    - Call updateExam on submit
    - Display success/error feedback
    - Update exam in list on success
    - _Requirements: 11.5, 11.6, 11.9_
  
  - [ ]* 19.5 Write property test for exam update API integration
    - **Property 35: Exam Update API Integration**
    - **Validates: Requirements 11.6**
  
  - [ ] 19.6 Add exam deletion capability
    - Provide delete button with confirmation
    - Call deleteExam on confirm
    - Display success/error feedback
    - Remove exam from list on success
    - _Requirements: 11.7, 11.8, 11.9_
  
  - [ ]* 19.7 Write property test for exam deletion API integration
    - **Property 36: Exam Deletion API Integration**
    - **Validates: Requirements 11.8**
  
  - [ ]* 19.8 Write unit tests for ExamsManagementScreen
    - Test form validation errors
    - Test create/update/delete success and error scenarios
    - _Requirements: 11.2, 11.4, 11.9_

- [ ] 20. Implement Teacher Portal: MarksEntryScreen
  - [ ] 20.1 Create MarksEntryScreen with exam selection and student list
    - Display list of exams for teacher's classes
    - When exam selected, fetch students using fetchClassStudents
    - Display student name with FormInput for marks
    - Display maximum marks for reference
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 20.2 Write property test for marks input field completeness
    - **Property 28: Marks Input Field Completeness**
    - **Validates: Requirements 10.3**
  
  - [ ] 20.3 Implement marks validation and submission
    - Validate marks using validateMarks (non-negative, not exceeding max)
    - Display inline validation errors
    - Call submitMarks on submit
    - Display success/error feedback
    - Invalidate exam cache on success
    - _Requirements: 10.5, 10.6, 10.7, 10.8, 10.9, 16.2_
  
  - [ ] 20.4 Implement existing marks loading
    - Fetch marks using fetchExamMarks on exam selection
    - Pre-populate FormInput components with existing marks
    - _Requirements: 10.10_
  
  - [ ]* 20.5 Write property test for existing marks loading
    - **Property 32: Existing Marks Loading**
    - **Validates: Requirements 10.10**
  
  - [ ]* 20.6 Write unit tests for MarksEntryScreen
    - Test validation error display
    - Test submission success and error scenarios
    - Test loading existing marks
    - _Requirements: 10.5, 10.6, 10.8, 10.9, 10.10_

- [ ] 21. Implement Teacher Portal: TimetableScreen
  - [ ] 21.1 Create TimetableScreen with weekly timetable display
    - Fetch timetable using fetchTimetable
    - Display timetable organized by day and time slot
    - Show class, subject, time slot for each entry
    - Highlight current day and time slot
    - Implement pull-to-refresh
    - Show empty state when no timetable
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7_
  
  - [ ]* 21.2 Write property test for timetable entry display
    - **Property 37: Timetable Entry Display**
    - **Validates: Requirements 12.3**
  
  - [ ]* 21.3 Write property test for timetable current highlighting
    - **Property 38: Timetable Current Highlighting**
    - **Validates: Requirements 12.4**
  
  - [ ] 21.4 Add week navigation to TimetableScreen
    - Provide previous/next week buttons
    - Update timetable fetch when week changes
    - _Requirements: 12.5_
  
  - [ ]* 21.5 Write unit tests for TimetableScreen
    - Test empty state display
    - Test week navigation
    - Test pull-to-refresh functionality
    - _Requirements: 12.5, 12.6, 12.7_

- [ ] 22. Implement Teacher Portal: TeacherNoticesScreen
  - [ ] 22.1 Create TeacherNoticesScreen (reuse NoticesScreen logic)
    - Fetch notices using fetchPublicNotices
    - Display title, body, tag for each notice
    - Sort by pinned status first, then by date descending
    - Implement pull-to-refresh
    - Show empty state when no notices
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [ ]* 22.2 Write unit tests for TeacherNoticesScreen
    - Test empty state display
    - Test pull-to-refresh functionality
    - _Requirements: 13.5, 13.6_

- [ ] 23. Checkpoint - Ensure teacher portal tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Implement offline caching integration
  - [ ] 24.1 Integrate cache layer with parent.js API functions
    - Wrap fetchStudentRecord with cache fallback
    - Wrap fetchStudentPayments with cache fallback
    - Wrap fetchStudentAttendance with cache fallback
    - Wrap fetchStudentExams with cache fallback
    - Wrap fetchPublicNotices with cache fallback
    - _Requirements: 15.1, 15.2, 15.7_
  
  - [ ]* 24.2 Write property test for successful API response caching
    - **Property 42: Successful API Response Caching**
    - **Validates: Requirements 15.1**
  
  - [ ]* 24.3 Write property test for offline cache fallback
    - **Property 43: Offline Cache Fallback**
    - **Validates: Requirements 15.2**
  
  - [ ]* 24.4 Write property test for cache key separation
    - **Property 48: Cache Key Separation**
    - **Validates: Requirements 15.7**
  
  - [ ] 24.5 Integrate cache layer with teacher.js API functions
    - Wrap fetchTeacherClasses with cache fallback
    - Wrap fetchClassStudents with cache fallback
    - Wrap fetchAttendanceHistory with cache fallback
    - Wrap fetchExams with cache fallback
    - Wrap fetchTimetable with cache fallback
    - _Requirements: 15.1, 15.2, 15.7_
  
  - [ ] 24.6 Add cache indicators to all screens
    - Display offline badge when showing cached data
    - Display cache timestamp
    - Implement background refresh on cached data display
    - Update UI when background refresh succeeds
    - _Requirements: 15.3, 15.4, 15.5, 15.6_
  
  - [ ]* 24.7 Write property test for cache indicator display
    - **Property 44: Cache Indicator Display**
    - **Validates: Requirements 15.3**
  
  - [ ]* 24.8 Write property test for cache timestamp display
    - **Property 45: Cache Timestamp Display**
    - **Validates: Requirements 15.4**
  
  - [ ]* 24.9 Write property test for background cache refresh
    - **Property 46: Background Cache Refresh**
    - **Validates: Requirements 15.5**
  
  - [ ]* 24.10 Write property test for cache update after refresh
    - **Property 47: Cache Update After Refresh**
    - **Validates: Requirements 15.6**

- [ ] 25. Implement data synchronization and error handling
  - [ ] 25.1 Add loading indicators to all write operations
    - Display loading state during API submissions
    - Disable submit buttons while loading
    - _Requirements: 16.1_
  
  - [ ]* 25.2 Write property test for loading indicator display
    - **Property 49: Loading Indicator Display**
    - **Validates: Requirements 16.1**
  
  - [ ] 25.2 Implement cache invalidation on successful writes
    - Invalidate student record cache after contact update
    - Invalidate attendance cache after attendance submission
    - Invalidate exam cache after marks submission
    - Invalidate exam cache after exam create/update/delete
    - Invalidate messages cache after message send
    - _Requirements: 16.2_
  
  - [ ]* 25.3 Write property test for cache update after successful write
    - **Property 50: Cache Update After Successful Write**
    - **Validates: Requirements 16.2**
  
  - [ ] 25.4 Add offline write prevention
    - Check network connectivity before write operations
    - Display message when offline and write attempted
    - _Requirements: 16.4_
  
  - [ ]* 25.5 Write property test for offline write prevention
    - **Property 51: Offline Write Prevention**
    - **Validates: Requirements 16.4**
  
  - [ ] 25.6 Implement client-side validation before submission
    - Validate all forms before API calls
    - Only submit if validation passes
    - _Requirements: 16.5_
  
  - [ ]* 25.7 Write property test for client-side validation before submission
    - **Property 52: Client-Side Validation Before Submission**
    - **Validates: Requirements 16.5**
  
  - [ ]* 25.8 Write unit tests for data synchronization
    - Test cache invalidation scenarios
    - Test offline detection and prevention
    - _Requirements: 16.2, 16.4, 16.5_

- [ ] 26. Implement comprehensive error handling
  - [ ] 26.1 Create error handling wrapper for API calls
    - Handle network errors with user-friendly messages
    - Handle timeout errors with retry option
    - Handle 401 errors with logout and redirect
    - Handle API errors with error message display
    - Log all errors with context
    - _Requirements: 19.1, 19.2, 19.3, 19.6, 19.7_
  
  - [ ]* 26.2 Write property test for API error message display
    - **Property 64: API Error Message Display**
    - **Validates: Requirements 19.1**
  
  - [ ]* 26.3 Write property test for network error message display
    - **Property 65: Network Error Message Display**
    - **Validates: Requirements 19.2**
  
  - [ ]* 26.4 Write property test for timeout error handling
    - **Property 66: Timeout Error Handling**
    - **Validates: Requirements 19.3**
  
  - [ ]* 26.5 Write property test for inline validation error display
    - **Property 67: Inline Validation Error Display**
    - **Validates: Requirements 19.4**
  
  - [ ] 26.6 Add success message display to all write operations
    - Display brief success toast after successful submissions
    - Auto-dismiss after 3 seconds
    - _Requirements: 19.5_
  
  - [ ]* 26.7 Write property test for success message display
    - **Property 68: Success Message Display**
    - **Validates: Requirements 19.5**
  
  - [ ]* 26.8 Write property test for error logging
    - **Property 69: Error Logging**
    - **Validates: Requirements 19.6**
  
  - [ ]* 26.9 Write property test for unexpected error handling
    - **Property 70: Unexpected Error Handling**
    - **Validates: Requirements 19.7**
  
  - [ ]* 26.10 Write unit tests for error handling
    - Test 401 handling with logout
    - Test retry functionality
    - Test error logging
    - _Requirements: 19.3, 19.6_

- [ ] 27. Implement authentication and authorization
  - [ ] 27.1 Add authentication requirement checks to all screens
    - Verify token exists before rendering
    - Redirect to login if no token
    - _Requirements: 18.1_
  
  - [ ]* 27.2 Write property test for authentication requirement
    - **Property 58: Authentication Requirement**
    - **Validates: Requirements 18.1**
  
  - [ ] 27.3 Implement 401 unauthorized response handling
    - Clear session on 401 response
    - Clear all cached data
    - Redirect to login screen
    - _Requirements: 18.3_
  
  - [ ]* 27.4 Write property test for unauthorized response handling
    - **Property 60: Unauthorized Response Handling**
    - **Validates: Requirements 18.3**
  
  - [ ] 27.5 Implement data isolation for parent role
    - Ensure parent can only access their child's data
    - Filter API responses by student ID
    - _Requirements: 18.4_
  
  - [ ]* 27.6 Write property test for parent data isolation
    - **Property 61: Parent Data Isolation**
    - **Validates: Requirements 18.4**
  
  - [ ] 27.7 Implement data isolation for teacher role
    - Ensure teacher can only access assigned classes
    - Filter API responses by teacher's classes
    - _Requirements: 18.5_
  
  - [ ]* 27.8 Write property test for teacher data isolation
    - **Property 62: Teacher Data Isolation**
    - **Validates: Requirements 18.5**
  
  - [ ] 27.9 Implement logout data cleanup
    - Clear all cached data on logout
    - Clear authentication tokens
    - _Requirements: 18.7_
  
  - [ ]* 27.10 Write property test for logout data cleanup
    - **Property 63: Logout Data Cleanup**
    - **Validates: Requirements 18.7**

- [ ] 28. Implement performance optimizations
  - [ ] 28.1 Add pagination or lazy loading to long lists
    - Implement for student lists (> 50 items)
    - Implement for payment lists (> 50 items)
    - Implement for attendance lists (> 50 items)
    - _Requirements: 20.3_
  
  - [ ]* 28.2 Write property test for list pagination
    - **Property 71: List Pagination**
    - **Validates: Requirements 20.3**
  
  - [ ] 28.3 Add input debouncing to search/filter fields
    - Debounce with 300ms threshold
    - Apply to any search or filter inputs
    - _Requirements: 20.5_
  
  - [ ]* 28.4 Write property test for input debouncing
    - **Property 72: Input Debouncing**
    - **Validates: Requirements 20.5**
  
  - [ ] 28.5 Implement request cancellation on navigation
    - Cancel pending API requests when user navigates away
    - Use AbortController for fetch requests
    - _Requirements: 20.6_
  
  - [ ]* 28.6 Write property test for request cancellation on navigation
    - **Property 73: Request Cancellation on Navigation**
    - **Validates: Requirements 20.6**
  
  - [ ]* 28.7 Write unit tests for performance optimizations
    - Test pagination behavior
    - Test debouncing behavior
    - Test request cancellation
    - _Requirements: 20.3, 20.5, 20.6_

- [ ] 29. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 30. Update navigation and integrate screens
  - [ ] 30.1 Update parent navigation in RootApp.js
    - Add navigation routes for StudentInfoScreen, AttendanceScreen, FeesScreen, ExamsScreen, NoticesScreen, MessagesScreen
    - Update HomeScreen to navigate to new screens
    - _Requirements: All parent requirements_
  
  - [ ] 30.2 Update teacher navigation in RootApp.js
    - Add navigation routes for ClassListScreen, MarkAttendanceScreen, AttendanceHistoryScreen, ExamsManagementScreen, MarksEntryScreen, TimetableScreen, TeacherNoticesScreen
    - Update HomeScreen to navigate to new screens
    - _Requirements: All teacher requirements_
  
  - [ ] 30.3 Update HomeScreen for parent role
    - Replace placeholder cards with navigation to actual screens
    - Update summary cards with real data
    - _Requirements: All parent requirements_
  
  - [ ] 30.4 Update HomeScreen for teacher role
    - Replace placeholder cards with navigation to actual screens
    - Add session selector UI
    - _Requirements: All teacher requirements_
  
  - [ ]* 30.5 Write unit tests for navigation integration
    - Test navigation from HomeScreen to all screens
    - Test back navigation
    - _Requirements: All requirements_

- [ ] 31. Update AuthContext for enhanced logout
  - [ ] 31.1 Enhance signOut function to clear all caches
    - Call clearAllCache from cache.js
    - Clear AsyncStorage authentication data
    - _Requirements: 18.7_
  
  - [ ]* 31.2 Write unit tests for enhanced logout
    - Test cache clearing on logout
    - Test token clearing on logout
    - _Requirements: 18.7_

- [ ] 32. Add session management UI for teachers
  - [ ] 32.1 Create session selector component
    - Display available sessions
    - Highlight selected session
    - Allow switching sessions
    - _Requirements: 17.1, 17.2, 17.3, 17.6_
  
  - [ ]* 32.2 Write property test for session list display
    - **Property 53: Session List Display**
    - **Validates: Requirements 17.1**
  
  - [ ]* 32.3 Write property test for selected session display
    - **Property 57: Selected Session Display**
    - **Validates: Requirements 17.6**
  
  - [ ] 32.4 Integrate session selector into teacher HomeScreen
    - Display session selector prominently
    - Reload data when session changes
    - _Requirements: 17.4, 17.6_
  
  - [ ]* 32.5 Write unit tests for session selector
    - Test session switching
    - Test data reload on session change
    - _Requirements: 17.3, 17.4_

- [ ] 33. Final integration and polish
  - [ ] 33.1 Review all screens for consistent styling
    - Ensure consistent colors, fonts, spacing
    - Match existing design system (blue theme, rounded corners)
    - _Requirements: All requirements_
  
  - [ ] 33.2 Add accessibility labels to all interactive elements
    - Add accessibilityLabel to buttons, inputs, toggles
    - Add accessibilityHint where helpful
    - _Requirements: All requirements_
  
  - [ ] 33.3 Test all screens on iOS and Android
    - Verify layout on different screen sizes
    - Test platform-specific components (DatePicker)
    - _Requirements: All requirements_
  
  - [ ] 33.4 Optimize images and assets
    - Compress student photos
    - Use appropriate image sizes
    - _Requirements: 20.4_
  
  - [ ]* 33.5 Write integration tests for complete user flows
    - Test parent flow: login → view student info → update contact → view attendance
    - Test teacher flow: login → select session → mark attendance → enter marks
    - _Requirements: All requirements_

- [ ] 34. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and UI interactions
- All property tests must run with minimum 100 iterations
- All property tests must include comment tags referencing design properties
- Implementation uses JavaScript/React Native as specified in the design document
