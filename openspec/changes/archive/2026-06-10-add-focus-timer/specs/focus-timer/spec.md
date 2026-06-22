# Focus Timer Specification

## ADDED Requirements

### Requirement: Preset Duration Selection

The system SHALL provide five preset duration buttons: 15, 25, 30, 45, and 90 minutes. Each button MUST store its duration in seconds (900, 1500, 1800, 2700, 5400 respectively) and MUST be tappable with a single action.

#### Scenario: User selects a preset duration

- GIVEN the focus timer is idle
- WHEN the user taps a preset button (15, 25, 30, 45, or 90)
- THEN the system stores that plannedDuration in seconds
- AND makes the start control active

#### Scenario: User changes preset before starting

- GIVEN the focus timer is idle with a duration already selected
- WHEN the user taps a different preset button
- THEN the system replaces the stored duration with the new value

---

### Requirement: Start/Stop State Machine

The system SHALL implement a two-state model: IDLE and ACTIVE. The system MUST respond to start and stop actions based on the current state.

#### Scenario: User starts a session

- GIVEN the timer is IDLE with a duration selected
- WHEN the user taps the start control
- THEN the system transitions to ACTIVE state
- AND records startedAt = Date.now()
- AND begins the 1-second tick interval

#### Scenario: User stops a session early

- GIVEN the timer is ACTIVE
- WHEN the user taps the stop control before duration expires
- THEN the system computes actualDuration = (Date.now() - startedAt) / 1000, rounded to nearest second
- AND logs the session with status "stopped-early"
- AND transitions to IDLE state

#### Scenario: Session auto-completes

- GIVEN the timer is ACTIVE
- WHEN the tick interval detects that (Date.now() - startedAt) / 1000 >= plannedDuration
- THEN the system computes actualDuration = plannedDuration
- AND logs the session with status "completed"
- AND transitions to IDLE state

---

### Requirement: Sticky Banner Display

The system SHALL display a sticky banner below the topbar only when the timer is ACTIVE. The banner MUST show the remaining time in MM:SS format and the elapsed time in MM:SS, and MUST include a stop control.

#### Scenario: Banner visible during active session

- GIVEN the timer is ACTIVE with plannedDuration = 1500 (25 min)
- WHEN the banner is rendered
- THEN it shows "remaining: 25:00" initially, decrementing each second
- AND shows "elapsed: 00:00" initially, incrementing each second
- AND contains a stop button

#### Scenario: Banner hidden when session ends

- GIVEN the timer transitions from ACTIVE to IDLE
- THEN the sticky banner is removed from the DOM or hidden

---

### Requirement: Browser Notification on Session End

The system SHALL request notification permission on first start and fire a notification when any session ends. If permission is denied, the system MUST silently skip notification and continue logging.

#### Scenario: Notification fires on session end (permission granted)

- GIVEN Notification.permission is "granted"
- WHEN a session ends (auto-complete or manual stop)
- THEN the system fires new Notification("Focus session complete", { body: "...min", icon: "..." })
- AND the banner/session log still occurs normally

#### Scenario: Notification silently skipped (permission denied)

- GIVEN Notification.permission is "denied"
- WHEN a session ends
- THEN no Notification is fired
- AND the session is logged to localStorage normally

#### Scenario: Permission requested on first start

- GIVEN the timer is started for the first time and Notification.permission is "default"
- WHEN the user taps start
- THEN Notification.requestPermission() is called
- AND the session begins regardless of the user's answer

---

### Requirement: Session Logging to localStorage

The system SHALL append a session record to the `focus:sessions` localStorage key on every session end. The key MUST be an array and MUST NOT be overwritten between sessions.

#### Scenario: Session logged on auto-complete

- GIVEN a session started at timestamp T with plannedDuration = 1500
- WHEN the session auto-completes
- THEN the system pushes to localStorage["focus:sessions"] the object: { startedAt: T, plannedDuration: 1500, actualDuration: 1500, status: "completed" }

#### Scenario: Session logged on early stop

- GIVEN a session started at timestamp T with plannedDuration = 1500, stopped after 600 seconds
- WHEN the user stops early
- THEN the system pushes: { startedAt: T, plannedDuration: 1500, actualDuration: 600, status: "stopped-early" }

---

### Requirement: Day Ring Focus Arc Rendering

The system SHALL add a violet (#8b5cf6) arc segment to the existing day ring SVG after each session ends. The arc MUST be drawn at the angular position corresponding to the session's start minute-of-day, with a length proportional to the actual duration.

#### Scenario: Focus arc painted on day ring after session

- GIVEN a session started at 9:00 AM (minute 540 of the day) with actualDuration = 1500s (25 min)
- WHEN the session ends
- THEN the day ring SVG receives a new circle/arc in violet (#8b5cf6)
- AND the arc center-angle corresponds to minute 540
- AND the arc sweep corresponds to 25 minutes of the 1440-minute day

---

### Requirement: Page Reload Loss (Non-Goal)

The system SHALL NOT preserve or recover timer state across page navigations or reloads. Reloading the page while a session is active MUST result in the session being discarded with no recovery attempt. This is an explicit non-goal and is not considered a defect.