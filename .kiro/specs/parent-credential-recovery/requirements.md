# Requirements Document

## Introduction

This feature adds a credential recovery system for the parent/student portal. Currently, parents and students who forget their portal username or password have no self-service recovery path and must contact the school office. The system will allow recovery via a registered email address stored in the student's directory record. It also introduces a post-login email registration prompt for students who have not yet registered an email, enabling future self-service recovery.

The recovery flow supports two paths: username recovery (email delivery) and password reset via OTP. If no email is registered, the system guides the user to either log in and register one, or contact the school office.

## Glossary

- **Portal**: The parent/student web portal accessible via the React frontend.
- **Recovery_System**: The backend and frontend components responsible for credential recovery.
- **Student_Directory**: The MongoDB collection of student records, each containing fields including `puser`, `ppass`, and optionally `email`.
- **OTP**: A 6-digit one-time password, valid for 10 minutes, used to authorize a password reset.
- **Email_Service**: The Resend API integration used to send transactional emails.
- **Recovery_Page**: The frontend page reached by clicking "Forgot username/password?" on the login screen.
- **Email_Registration_Prompt**: The modal shown after a successful parent login when no email is registered for the student.
- **Registered_Email**: An email address stored in the `email` field of a student's record in the Student_Directory.

---

## Requirements

### Requirement 1: Forgot Credentials Link on Login Page

**User Story:** As a parent or student, I want a "Forgot username/password?" link on the portal login page, so that I can initiate credential recovery without contacting the school office.

#### Acceptance Criteria

1. THE Portal SHALL display a "Forgot username/password?" link on the parent portal login tab.
2. WHEN the user clicks the "Forgot username/password?" link, THE Portal SHALL navigate to the Recovery_Page.

---

### Requirement 2: Recovery Page — Choose Recovery Type

**User Story:** As a parent or student, I want to choose between recovering my username or resetting my password, so that I can address the specific credential I have lost.

#### Acceptance Criteria

1. THE Recovery_Page SHALL present two options: "Recover Username" and "Change Password".
2. THE Recovery_Page SHALL require the user to enter their student admission number or registered email address to identify their account before proceeding.
3. WHEN the user selects "Recover Username", THE Recovery_System SHALL proceed to the username recovery flow.
4. WHEN the user selects "Change Password", THE Recovery_System SHALL proceed to the password reset flow.

---

### Requirement 3: Username Recovery Flow

**User Story:** As a parent or student, I want my username sent to my registered email, so that I can retrieve a forgotten username without help from the school.

#### Acceptance Criteria

1. WHEN the user submits a valid identifier and selects "Recover Username", THE Recovery_System SHALL look up the student record in the Student_Directory using the provided identifier.
2. WHEN a matching student record is found and a Registered_Email exists, THE Recovery_System SHALL send an email containing the student's `puser` value to the Registered_Email via the Email_Service.
3. WHEN the email is sent successfully, THE Recovery_Page SHALL display a confirmation message stating the username has been sent to the registered email address.
4. IF the Email_Service fails to deliver the email, THEN THE Recovery_System SHALL display an error message and allow the user to retry.

---

### Requirement 4: Password Reset Flow — OTP

**User Story:** As a parent or student, I want to reset my password using an OTP sent to my registered email, so that I can regain access to the portal securely.

#### Acceptance Criteria

1. WHEN the user submits a valid identifier and selects "Change Password", THE Recovery_System SHALL send a 6-digit OTP to the Registered_Email via the Email_Service.
2. THE Recovery_System SHALL store the OTP and an expiry timestamp of 10 minutes from generation in the student's record in the Student_Directory.
3. THE Recovery_Page SHALL display an OTP entry form after the OTP is sent.
4. WHEN the user submits the correct OTP before expiry, THE Recovery_Page SHALL display a new password form.
5. WHEN the user submits a new password of at least 6 characters, THE Recovery_System SHALL update the `ppass` field in the Student_Directory and clear the stored OTP and expiry.
6. WHEN the user submits an incorrect OTP, THE Recovery_System SHALL display an error message and allow the user to re-enter the OTP.
7. WHEN the user submits an OTP after its expiry, THE Recovery_System SHALL display an expiry error and allow the user to request a new OTP.
8. IF the Email_Service fails to send the OTP, THEN THE Recovery_System SHALL display an error message and allow the user to retry.

---

### Requirement 5: No Registered Email — Unregistered State Handling

**User Story:** As a parent or student without a registered email, I want to be informed of my options, so that I know how to proceed when self-service recovery is unavailable.

#### Acceptance Criteria

1. WHEN the user submits an identifier and no Registered_Email is found in the matching student record, THE Recovery_Page SHALL display a message stating: "Login using your credentials to register your email for future recovery, or contact the school office."
2. THE Recovery_Page SHALL provide a link back to the portal login page from the no-email state page.

---

### Requirement 6: Post-Login Email Registration Prompt

**User Story:** As a parent or student who has just logged in without a registered email, I want to be prompted to register my email, so that I can enable future self-service credential recovery.

#### Acceptance Criteria

1. WHEN a parent or student successfully logs in and the matching student record has no Registered_Email, THE Portal SHALL display the Email_Registration_Prompt.
2. THE Email_Registration_Prompt SHALL offer two actions: "Register Email" and "Do it Later".
3. WHEN the user selects "Do it Later", THE Portal SHALL dismiss the Email_Registration_Prompt and navigate to the portal dashboard.
4. WHEN the user selects "Register Email", THE Email_Registration_Prompt SHALL display an email input field.
5. WHEN the user submits a valid email address via the Email_Registration_Prompt, THE Recovery_System SHALL save the email to the `email` field of the student's record in the Student_Directory.
6. WHEN the email is saved successfully, THE Portal SHALL dismiss the Email_Registration_Prompt and navigate to the portal dashboard.
7. IF saving the email fails, THEN THE Email_Registration_Prompt SHALL display an error message and allow the user to retry.
8. WHEN a parent or student successfully logs in and the matching student record already has a Registered_Email, THE Portal SHALL navigate directly to the portal dashboard without displaying the Email_Registration_Prompt.

---

### Requirement 7: Student Directory Email Field

**User Story:** As a system, I need the student record to support an email field, so that registered emails can be stored and retrieved for credential recovery.

#### Acceptance Criteria

1. THE Student_Directory SHALL store an optional `email` field on each student record.
2. THE Recovery_System SHALL read and write the `email` field without affecting any other student record fields.
3. WHEN the `email` field is absent or empty, THE Recovery_System SHALL treat the student as having no Registered_Email.

---

### Requirement 8: Security and Rate Limiting

**User Story:** As a school administrator, I want the recovery system to be resistant to abuse, so that student accounts are not compromised through the recovery flow.

#### Acceptance Criteria

1. THE Recovery_System SHALL not reveal whether a given identifier matches a student record when no email is registered, displaying the same "no email registered" message regardless of whether the identifier matched.
2. THE Recovery_System SHALL invalidate any existing OTP for a student when a new OTP is requested.
3. WHEN a password reset is completed successfully, THE Recovery_System SHALL clear the OTP and expiry from the student record immediately.
4. THE Recovery_System SHALL accept a new password only if it is at least 6 characters in length.
