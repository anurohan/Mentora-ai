# Database Schema

The normalized local schema uses UUID primary keys, UTC timestamps plus the user timezone, foreign keys, ownership indexes, and append-only event records where historical accuracy matters.

## Core tables

| Table | Purpose | Ownership |
|---|---|---|
| users | credentials and account identity | self |
| user_profiles | education and goals | user_id |
| user_preferences | language, theme, notification and privacy choices | user_id |
| courses / subjects | learning structure | user_id |
| syllabi / syllabus_units / syllabus_topics | extracted source hierarchy | user_id |
| topic_progress | completion and review state | user_id |
| chat_sessions / chat_messages | contextual tutor history | user_id |
| animation_specs | validated animation data | user_id |
| study_sessions / activity_events | observed and estimated signals | user_id |
| study_warnings | warning evidence | user_id |
| daily_summaries / study_goals | derived analytics and targets | user_id |
| library_folders / library_files | private documents and metadata | user_id |
| sync_operations | idempotent cloud queue | user_id |
| festival_events | configurable adaptive theme calendar | global/config |
| audit_events | security and data-management trail | user_id |

All user-owned tables require a user_id index and an ownership check in the service layer. Historical records are never overwritten by a sync merge; conflicts create explicit resolution records.
