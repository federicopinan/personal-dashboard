# Delta for Focus Timer

## MODIFIED Requirements

### Requirement: Start/Stop State Machine

The system SHALL support IDLE, ACTIVE, and PAUSED states. The system MUST start in fullscreen focus mode, MUST keep countdown state explicit, and MUST respond to pause, reset, stop, and completion actions according to the current state.
(Previously: the timer used only IDLE and ACTIVE states with start and stop actions.)

#### Scenario: User starts a session

- GIVEN the timer is IDLE with a duration selected
- WHEN the user taps the start control
- THEN the system transitions to ACTIVE state
- AND records startedAt = Date.now()
- AND begins the 1-second tick interval

#### Scenario: User pauses and resumes a session

- GIVEN the timer is ACTIVE with time remaining
- WHEN the user taps pause
- THEN the system freezes the countdown and transitions to PAUSED
- WHEN the user resumes
- THEN countdown continues from the paused remaining time

#### Scenario: User resets a running or paused session

- GIVEN the timer is ACTIVE or PAUSED
- WHEN the user taps reset
- THEN the remaining time returns to plannedDuration
- AND no focus session is logged

#### Scenario: User stops a session early

- GIVEN the timer is ACTIVE or PAUSED
- WHEN the user taps the stop control before duration expires
- THEN the system computes actualDuration from focused elapsed time, rounded to nearest second
- AND logs the session with status "stopped-early"
- AND transitions to IDLE state

#### Scenario: Session auto-completes

- GIVEN the timer is ACTIVE
- WHEN the countdown reaches zero
- THEN the system computes actualDuration = plannedDuration
- AND logs the session with status "completed"
- AND transitions to IDLE state

---

### Requirement: Sticky Banner Display

The system SHALL display a fullscreen focus mode when the timer is ACTIVE or PAUSED. The view MUST show a circular countdown, remaining time in MM:SS format, and pause/resume, reset, and stop controls. The previous sticky banner MUST NOT be shown during fullscreen focus mode.
(Previously: an active timer displayed a sticky banner below the topbar with remaining time, elapsed time, and stop control.)

#### Scenario: Fullscreen focus mode visible during active session

- GIVEN the timer is ACTIVE with plannedDuration = 1500
- WHEN the focus view is rendered
- THEN it shows a circular countdown and "25:00" initially
- AND contains pause, reset, and stop controls

#### Scenario: Fullscreen focus mode reflects paused state

- GIVEN the timer is PAUSED
- WHEN the focus view is rendered
- THEN the visible time remains unchanged until resumed
- AND the primary control offers resume

#### Scenario: Focus mode exits when session ends

- GIVEN the timer transitions from ACTIVE or PAUSED to IDLE
- THEN the fullscreen focus view is removed from the DOM or hidden
