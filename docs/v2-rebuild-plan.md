# 75 Squad V2 Rebuild Plan (Web App First)

Status: Approved planning spec (pre-build)

Branch: `revamp/75-hard-webapp-rebuild-plan`

Last updated: 2026-02-22

## 1. Goal

Rebuild 75 Squad into a polished, mobile-first web app that feels app-like, is simple to use daily, and is reliable for real group accountability during the 75 Hard challenge.

This is a **web app first** rebuild (not native-first), using the existing stack and backend:

- Next.js
- Supabase
- Netlify

## 2. Product Direction

75 Squad V2 should feel like a private, lightweight accountability app with social energy:

- Invite-only squads
- Fast daily check-ins
- Clear visibility into what teammates completed
- Social feed interactions (Strava-like feel, but simpler)
- Reliable persistence and correct day logic

### Design goals

- Mobile-first layout and interactions
- One primary scrollable "Today" experience
- Glassmorphism / liquid-glass visual style
- Clear hierarchy, fewer confusing states
- Large tap targets and low-friction actions

### Non-goals (launch)

- Native mobile app
- Complex OAuth providers (Google optional/off by default)
- Paid notification channels
- Heavy photo-first social features
- Public/community discovery

## 3. Locked Product Decisions

### Squad and access

- Invite-only signup and joining
- Email + password auth (primary)
- No hard cap on members
- Persistent login on browser (do not force frequent re-login)

### Core challenge behavior

- Progress photo is optional and low-priority
- Photos may be supported, but not central to launch UX
- Users can backfill missed tasks for past days (no future editing)
- If a day is missed:
  - user continues tracking
  - streak breaks
  - failed day remains visible in history

### Feed and social

- 5 tabs including Feed
- Feed should allow interaction on others' activity
- Launch feed scope:
  - reactions
  - comments
- No advanced media posting required for launch

### Competition / rankings

- Launch leaderboard is lightweight:
  - daily completion status
  - streaks
  - completion percentage / consistency summaries

### Notifications

- Deferred for launch to keep the product free/simple
- Notification settings/data model may remain, but notification UX should not block launch

### Timezone

- Squad timezone is group-wide and authoritative
- Initial target squad timezone: `America/New_York`

## 4. Platform Strategy (Approved)

### Chosen path: Web app first

Build the production product in this repo as a mobile-first web app, then consider native later if needed.

Why this is the right choice now:

- Fastest path to a stable product for the group
- Existing backend/data model already exists
- Current blockers are reliability + UX, not native device capabilities
- Lower cost and lower operational complexity
- Can still feel app-like on phones (PWA-style UX)

### Rork / Lovable / Base44 role (optional)

Use external builders/tools for:

- UI inspiration
- quick concept prototypes
- design exploration

Do not use them as the source of truth for production logic in V2.

## 5. V2 Launch Feature Scope

## 5.1 Must-have (launch)

### Authentication and account recovery

- Invite-only email/password auth
- Forgot password flow
- Reset password page
- Persistent session handling across refreshes
- Clear auth errors and recovery paths

### Squad management

- Create squad
- Join by invite link/code
- Stable membership resolution
- Reliable squad loading on dashboard

### Daily tracking

- Daily checklist (required tasks + optional photo task)
- One-tap completion
- Correct day number based on squad timezone
- Quote of the day (same quote for everyone)
- Task notes (optional)
- State persists correctly across refresh/logout/login

### History and transparency

- Personal history view by day
- Member history view by day
- Ability to inspect exactly which tasks were completed
- Backfill edits for past days
- Edited/backfilled indicator for transparency (feed/history)

### Squad visibility

- Squad snapshot with per-member required-task progress
- Member cards clickable to detailed history
- Loading/empty/error states that are actionable

### Social feed (launch)

- Activity feed (challenge-related actions)
- Reactions
- Comments
- Private squad context only

### UI/UX

- Mobile-first 5-tab experience
- App-like navigation and spacing
- Improved responsiveness on phone + laptop
- Glassmorphism visual system

## 5.2 Nice-to-have (post-launch / V2.1)

- Real progress photo uploads (first-class experience)
- Web push / in-app notifications polish
- Email notifications with custom SMTP
- Weekly summary cards
- Rich leaderboards and weekly rankings
- Photo posts in feed

## 6. UX / Information Architecture (V2)

Top-level tabs (5):

1. Today
2. Squad
3. Feed
4. History
5. Profile

### Today (primary screen)

Main daily experience in one scrollable page:

- Day progress header (day X / streak / completion status)
- Quote card
- Daily checklist (fast tap interaction)
- Quick squad snapshot (who is on track today)
- Optional quick entry to Feed / History

### Squad

- Invite link/code sharing
- Member roster
- Per-member daily completion summary
- Tap into member detail/history

### Feed

- Squad activity stream
- Reactions/comments on activity
- Lightweight, fast, accountability-first

### History

- Your day-by-day history
- Date/day navigation
- Backfill editing for past days
- Clear indicators for complete/missed/edited days

### Profile

- Account profile
- Password change (recommended to add)
- Reminder settings (can remain hidden/de-emphasized for launch)
- Basic preferences

## 7. Data and Reliability Rules (Critical)

This rebuild must prioritize correctness over visual polish.

### 7.1 Canonical squad day logic

All APIs and UI should use one consistent day engine:

- squad timezone (authoritative)
- squad start date
- current timestamp

Outputs:

- squad "today" date
- day number (1-75+)
- streak status

### 7.2 Completion writes

Task completions must be written using canonical server-side date calculation.

Requirements:

- prevent duplicate rows for same user/group/task/date
- safe toggles (idempotent behavior)
- no incorrect carryover to next day due to timezone mismatch
- backfill writes support explicit past date (validated)

### 7.3 Backfill editing policy

Users may edit:

- current day
- past days only

Users may not edit:

- future days

Backfill updates should:

- recompute streaks
- refresh derived progress summaries
- be marked as edited/backfilled in history/feed metadata

### 7.4 Membership resolution

Squad membership loading must not fail due to transient auth or missing legacy rows.

Requirements:

- deterministic membership lookup
- legacy owner row self-healing
- clean retry behavior for auth/session timing
- user-facing fallback message with retry action

### 7.5 Session persistence

Expected behavior:

- user logs in once on browser
- app restores session reliably on refresh/reopen
- minimal auth race conditions between UI and API calls

## 8. Technical Build Strategy

Approach: backend hardening first, then UI rebuild.

### Phase 0: Planning and spec (this doc)

- lock product decisions
- define IA
- define data correctness rules
- sequence work

### Phase 1: Reliability hardening (before redesign)

- auth/session persistence cleanup
- forgot password + reset flow completion
- add change-password in profile
- fix membership loading edge cases
- unify canonical day/date logic
- add backfill support to checklist API
- ensure streak recomputation after backfill/toggles

### Phase 2: New app shell and design system

- mobile-first app shell
- 5-tab navigation
- shared components (cards, rows, buttons, states)
- glassmorphism token system and spacing scale
- skeleton/empty/error state library

### Phase 3: Rebuild Today tab

- daily header
- quote
- checklist
- quick squad status
- polished interactions and optimistic UI

### Phase 4: Squad + member detail experience

- squad roster and status
- member drilldown
- invite sharing improvements

### Phase 5: Feed (reactions/comments launch scope)

- activity card model
- feed list UX
- reactions/comments interactions
- correctness and ordering

### Phase 6: History + backfill UX

- day/date navigation
- edit past day checklist
- edited/backfilled indicators
- streak/summary recalculation feedback

### Phase 7: Final polish and release hardening

- performance tuning (mobile)
- accessibility review
- security checks (secrets, audit, vuln scan)
- E2E smoke tests
- production deploy validation

## 9. Launch Acceptance Criteria

V2 launch is "ready" when all are true:

- Users can sign in with email/password and stay signed in across browser reloads
- Forgot password works for locked-out accounts
- Squad join/create works reliably
- No recurring "Could not load group membership" errors in normal use
- Checklist writes persist correctly and survive refresh/logout/login
- Day number and completion state are correct in squad timezone
- Users can view and edit past days (no future edits)
- Streak updates correctly after same-day edits and backfills
- Feed supports reactions/comments on squad activity
- UI is clean and usable on phone and laptop
- No secrets committed; security scans pass

## 10. Risks and Mitigations

### Risk: auth race conditions causing transient 401s

Mitigation:

- centralize auth bootstrap
- retry only where necessary
- improve loading states instead of silent failure

### Risk: timezone/day bugs creating false completions

Mitigation:

- one canonical day engine
- server-authoritative writes
- repair utility retained as fallback
- targeted tests for timezone boundaries

### Risk: UI revamp slows delivery

Mitigation:

- harden backend first
- rebuild tab-by-tab
- launch with lean feed and lightweight leaderboard

### Risk: feature creep (notifications/photos/advanced social)

Mitigation:

- keep launch scope fixed
- move extras to V2.1 backlog

## 11. Immediate Next Build Tasks (Phase 1)

1. Finish and validate forgot-password/reset-password flow
2. Add profile "Change password" flow
3. Audit and harden session persistence across SSR + client hydration
4. Fix group membership loading edge cases and error handling
5. Implement checklist backfill API support (past days only)
6. Recompute streak/progress after backfills
7. Add tests for timezone/day/backfill behavior

## 12. V2.1 Backlog (Not Launch-Critical)

- Real photo uploads and photo-first feed cards
- Push notifications
- Email notifications via custom SMTP
- Weekly challenge summaries
- Rich leaderboard modes (weekly consistency, first-to-finish trends)
- PWA install polish and offline enhancements
