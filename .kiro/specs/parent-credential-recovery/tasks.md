# Implementation Plan: Parent Credential Recovery

## Overview

Implement self-service credential recovery for the parent portal. This covers backend model changes, five new API routes, frontend recovery screens in the Login component, and a post-login email registration modal in ParentPortal.

## Tasks

- [x] 1. Extend Student model with email/OTP fields
  - Add `email`, `otp`, and `otpExpiry` fields to `server/models/Student.js`
  - No migration needed — Mongoose treats absent fields as defaults
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Implement backend recovery routes in `server/routes/auth.js`
  - [x] 2.1 Add `POST /auth/student-recover-username` route
    - Accept `{ identifier }` (admno or email, case-insensitive lookup)
    - If student found with email: send username email via `sendMail`, return `{ ok: true }`
    - If no email or no match: return `{ ok: true, noEmail: true }` (same shape — Req 8.1)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1_

  - [x] 2.2 Add `POST /auth/student-request-otp` route
    - Accept `{ identifier }`, look up student by admno or email
    - Generate 6-digit OTP, store with `otpExpiry = now + 10min`, overwrite any existing OTP
    - Send OTP email, return `{ ok: true, maskedEmail }` or `{ ok: true, noEmail: true }`
    - _Requirements: 4.1, 4.2, 4.8, 8.1, 8.2_

  - [x] 2.3 Add `POST /auth/student-verify-otp` route
    - Accept `{ identifier, otp }`, validate value and expiry
    - Return `{ ok: true }` on success; `400` with error message on invalid/expired
    - _Requirements: 4.4, 4.6, 4.7_

  - [x] 2.4 Add `POST /auth/student-reset-password` route
    - Accept `{ identifier, otp, newPassword }`, re-validate OTP
    - Reject `newPassword.length < 6`; update `ppass`, clear `otp` and `otpExpiry`
    - _Requirements: 4.5, 8.3, 8.4_

  - [ ]* 2.5 Write property test for OTP expiry invalidation
    - **Property 1: OTP expiry invalidation**
    - Generate random OTP strings and timestamps past `otpExpiry`; assert verify route always rejects
    - **Validates: Requirements 4.2, 4.7**

  - [ ]* 2.6 Write property test for OTP overwrite on re-request
    - **Property 2: OTP overwrite on re-request**
    - Generate arbitrary first OTPs; request a second OTP; assert first OTP is rejected
    - **Validates: Requirements 8.2**

  - [ ]* 2.7 Write property test for password reset clears OTP
    - **Property 3: Password reset clears OTP**
    - After successful reset, assert `otp === ''` and `otpExpiry === null`
    - **Validates: Requirements 4.5, 8.3**

  - [ ]* 2.8 Write property test for minimum password length enforcement
    - **Property 4: Minimum password length enforcement**
    - Generate strings of length 0–5; assert all are rejected by `student-reset-password`
    - **Validates: Requirements 4.5, 8.4**

  - [ ]* 2.9 Write property test for no-email response indistinguishability
    - **Property 5: No-email response indistinguishability**
    - Generate arbitrary identifiers (matching and non-matching); assert response shape is identical `{ ok: true, noEmail: true }`
    - **Validates: Requirements 8.1**

  - [x] 2.10 Add `POST /auth/student-register-email` route (authenticated)
    - Require valid parent JWT (`req.user.studentId`); accept `{ email }`
    - Update `email` field on the student document, return `{ ok: true }`
    - _Requirements: 6.5, 7.1, 7.2_

  - [ ]* 2.11 Write property test for email registration round-trip
    - **Property 6: Email registration round-trip**
    - Register an email then read back the student record; assert `student.email === submitted email`
    - **Validates: Requirements 6.5, 7.1, 7.2**

- [x] 3. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add storage functions in `client/src/storage.js`
  - Add `studentRecoverUsername(identifier)` — `POST /auth/student-recover-username`
  - Add `studentRequestOtp(identifier)` — `POST /auth/student-request-otp`
  - Add `studentVerifyOtp(identifier, otp)` — `POST /auth/student-verify-otp`
  - Add `studentResetPassword(identifier, otp, newPassword)` — `POST /auth/student-reset-password`
  - Add `studentRegisterEmail(email)` — `POST /auth/student-register-email` (uses existing auth token)
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.5_

- [x] 5. Implement recovery flow in `client/src/App.jsx` (Login component)
  - [x] 5.1 Add "Forgot username/password?" link to the parent login tab
    - Clicking the link sets `recoveryStep` state to `'choose'`
    - _Requirements: 1.1, 1.2_

  - [x] 5.2 Implement `choose` screen
    - Identifier input (admno or email) + two buttons: "Recover Username" and "Change Password"
    - Back link returns to normal login form
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.3 Implement `username-sent` confirmation screen
    - Display confirmation that username was emailed; include back-to-login link
    - Handle email service failure with retry button
    - _Requirements: 3.3, 3.4_

  - [x] 5.4 Implement `otp-entry` screen
    - 6-digit OTP input; "Verify OTP" button calls `studentVerifyOtp`
    - Show expiry error with "Request new OTP" button; show incorrect OTP error with retry
    - _Requirements: 4.3, 4.6, 4.7_

  - [x] 5.5 Implement `new-password` screen
    - New password input (min 6 chars inline validation); submit calls `studentResetPassword`
    - On success transition to `success` screen
    - _Requirements: 4.4, 4.5, 8.4_

  - [x] 5.6 Implement `success` and `no-email` screens
    - `success`: password reset confirmation with back-to-login link
    - `no-email`: message "Login using your credentials to register your email for future recovery, or contact the school office." with back-to-login link
    - _Requirements: 4.5, 5.1, 5.2_

- [x] 6. Implement email registration modal in `client/src/ParentPortal.jsx`
  - [x] 6.1 Add `EmailRegistrationPrompt` modal component
    - On mount, check `student.email`; show modal if absent, skip if present
    - Offer "Register Email" and "Do it Later" actions
    - _Requirements: 6.1, 6.2, 6.3, 6.8_

  - [x] 6.2 Wire up email submission in the modal
    - "Register Email" reveals email input; submit calls `studentRegisterEmail`
    - On success dismiss modal and navigate to dashboard; on failure show error with retry
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [x] 6.3 Pass `email` field through parent-login response
    - Ensure `parent-login` route includes `email` in the returned `student` object so the frontend can check it
    - _Requirements: 6.1, 6.8_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** (already available in the JS ecosystem)
- All recovery routes are unauthenticated except `student-register-email`
- OTP and email fields use `strict: false` schema — no migration required
- Password is stored as plain text (`ppass`) consistent with the existing codebase
