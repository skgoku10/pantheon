# Pantheon — Feature Spec & Build Plan

A gamified focus timer for ADHD minds, built around constellation-drawing and real-world mythology. This document captures everything designed in the prototype, translated into a build plan for a native iOS app, plus the concrete steps to get it onto the App Store.

---

## 1. Core Concept

Press start, pick a duration, and a figure from world mythology slowly reveals itself — drawn star by star — for as long as you stay focused. Leave early and you keep partial credit, no shame. Over time you chart a personal sky across five real mythologies: Greek, Norse, Egyptian, Japanese, and Chinese.

**Design principles (non-negotiable — these are what make it ADHD-appropriate, not just another focus timer):**
- No punishment for leaving early — partial credit always
- No streak-shaming, no guilt-based language anywhere
- No accounts required
- Free, no ads, no paywall blocking core functionality
- Tiny sessions (5 min) are treated as real progress, not a lesser version of "real" focus

---

## 2. Feature Inventory

### Core loop
- Duration picker: 5 / 15 / 25 / 45 minutes
- Pantheon selector (5 chips: Greek, Norse, Egyptian, Japanese, Chinese) — each is an independent progress track
- Constellation reveal: figure's star-pattern draws progressively as time elapses, ghost outline visible from the start
- Points: ~10/minute, +20% bonus for completing a full session, partial credit for ending early
- Background-safe timer: elapsed time always computed from a stored start `Date`, never from a running counter (critical correctness requirement — see Section 4)

### Progression system
- 35 total figures: 7 per pantheon, increasing in cost/complexity (Common → Common → Rare → Rare → Mythic → Mythic → Legendary)
- Each pantheon unlocks sequentially (can't skip ahead within a culture)
- Overflow points roll forward automatically into the next figure in that pantheon
- **Two paths to unlock:** passive (focus sessions auto-invest into whichever pantheon is selected) and active (spend banked points directly in the Codex to instantly finish any pantheon's next figure)
- Banked points (spendable) tracked separately from lifetime points (permanent, never decreases — a stat, not a currency)

### Codex
- Grid of all 35 figures grouped by pantheon, locked figures shown as silhouette-locked placeholders
- Tier legend (Common/Rare/Mythic/Legendary with point-cost ranges)
- Tapping an unlocked figure opens a detail view: full mythological lore paragraph, option to set/unset as Companion
- "Next up" figure in each pantheon shows live progress and a spend-to-unlock button

### Companion
- Any unlocked figure can be set as a Companion
- Appears as a small badge pre-session, during active sessions ("[Name] is with you"), and on its Codex card

### Session screen detail
- Progress ring around the constellation showing *this session's* completion %, distinct from the figure-unlock progress
- Milestone pulse at 25/50/75% of the session
- Occasional shooting stars (ambient, ~every 15–30s)
- Sky background subtly deepens as the session progresses
- Rotating motivational/disciplinary phrases, changing every 5 minutes
- "End early — keep what you've earned" — always available, never hidden or hard to find

### Calendar tracker
- Month-grid view of session start counts per day
- Today visually distinguished regardless of activity
- Prev/next month navigation

### Onboarding
- 6-page flow: welcome (logo), mechanic demo, "nothing is ever lost" (partial-credit framing), multi-culture overview, small-sessions framing, closing tone-setter
- Back navigation, no skip option (intentional — it's short enough to sit through once)
- Replayable anytime from the Codex

### Theming
- Full dark/light mode — the night-sky/constellation visuals stay dark in both modes (intentional, it's the emotional core); surrounding chrome (nav, Codex, header) adapts
- Palette: "Mythic Night" — deep indigo cosmos, warm gold accent, soft coral for Legendary tier
- Logo: orbiting-star mark

---

## 3. Data Model (Swift)

```swift
struct Figure: Identifiable, Codable {
    let id: String              // e.g. "greek-0"
    let name: String
    let pantheon: Pantheon
    let tier: Tier
    let cost: Int
    let lore: String
    let starPositions: [CGPoint] // normalized 0...1, for constellation drawing
}

enum Pantheon: String, Codable, CaseIterable {
    case greek, norse, egyptian, japanese, chinese
}

enum Tier: String, Codable {
    case common, rare, mythic, legendary
}

struct UserProgress: Codable {
    var unlockedFigureIDs: Set<String> = []
    var investedPoints: [String: Int] = [:]   // figureID -> points invested
    var lifetimePoints: Int = 0
    var bankedPoints: Int = 0
    var companionID: String? = nil
    var sessionLog: [String: Int] = [:]       // "yyyy-MM-dd" -> session count
    var onboardingComplete: Bool = false
    var colorScheme: AppColorScheme = .dark
}
```

Store `Figure` data as a static, bundled JSON or Swift literal array (mirrors the `PANTHEONS` object from the prototype) — it's static content, no need for a database.

`UserProgress` is the only thing that needs persistence. Recommended: `Codable` struct persisted via `UserDefaults` (simple, sufficient for this data size) with an optional `NSUbiquitousKeyValueStore` (iCloud key-value) mirror for cross-device continuity — see Section 5.

---

## 4. Critical Technical Requirements

These aren't features — they're correctness issues that **must** be handled properly in the native build, several of which the web prototype already solved in logic (just needs porting).

### 4.1 Background-safe timer
Never use a running counter incremented on a timer tick. Store `sessionStartDate: Date` when a session begins. On every UI update (and on `scenePhase` change to `.active`), compute:
```swift
let elapsed = min(totalDuration, Date().timeIntervalSince(sessionStartDate))
```
Use a `TimelineView` or a lightweight `Timer.publish` purely to trigger UI refreshes — the *source of truth* for elapsed time is always the timestamp diff, never the tick count. This is the same logic already implemented and tested in the prototype; it just needs a direct Swift port.

### 4.2 Session continuity across app suspension
iOS suspends most background execution. If the app is killed or backgrounded for the full duration, on next launch check: was a session active, and has `totalDuration` elapsed since `sessionStartDate`? If yes, resolve it as a completed session retroactively. Store the active-session state in `UserDefaults` immediately on start, not just in memory.

### 4.3 Local notifications (optional, recommended)
A single, gentle, **opt-in only** daily reminder (e.g., "Got five minutes?") — never framed as a streak warning. Use `UNUserNotificationCenter` with a user-configurable time, defaulting to off.

### 4.4 Data durability
`UserDefaults`-only storage means a reset or lost phone wipes all progress. Recommend syncing the `UserProgress` struct via `NSUbiquitousKeyValueStore` (simple, free, no backend needed) so progress survives device changes for users signed into iCloud. This should be considered for v1, not deferred — losing 35 unlocked figures is a real loss for a user.

### 4.5 Accessibility
- VoiceOver labels on every interactive element, especially the constellation visuals (these are currently purely visual — need a meaningful accessibility label like "Pegasus, 60% charted")
- Dynamic Type support throughout
- `@Environment(\.accessibilityReduceMotion)` check — disable shooting stars, milestone pulses, and the background hue shift when true. This was flagged as a gap in the prototype and should be resolved before submission, not after.

---

## 5. SwiftUI Architecture

```
PantheonApp (App)
 └── ContentView (TabView)
      ├── FocusView
      │    ├── PantheonPicker
      │    ├── DurationPicker
      │    ├── ConstellationView (Shape + trim-based reveal)
      │    └── ActiveSessionView (progress ring, milestone pulses, phrases)
      ├── CodexView
      │    ├── BankedPointsCard
      │    ├── TierLegend
      │    ├── PantheonSection (×5)
      │    └── FigureDetailSheet (lore, companion toggle)
      └── TrackerView (calendar grid)

OnboardingView (presented full-screen on first launch / replay)
```

**State management:** A single `@StateObject var progress: ProgressStore` (an `ObservableObject` wrapping `UserProgress`, with methods like `startSession()`, `finishSession()`, `spendToUnlock(pantheon:)` — these map almost directly from the prototype's `finishSession`/`spendToUnlock` functions) injected via `.environmentObject` app-wide.

**Constellation drawing:** Implement as a custom `Shape` building a `Path` from the figure's star positions, using `.trim(from:to:)` on the connecting lines driven by a `progress: Double` property, plus a parallel layer of `Circle()` views for the stars themselves, opacity/scale driven by the same progress value. This is a direct, idiomatic translation of the prototype's SVG approach.

**Icons:** The current silhouette icons are simple shape primitives (circles, paths, polygons, lines) — port these directly as SwiftUI `Path`s rather than rasterizing to images. This keeps them crisp at any size and tintable for dark/light mode without needing two asset sets.

---

## 6. Known Gaps to Resolve Before Submission

| Gap | Priority | Notes |
|---|---|---|
| Reduce Motion support | High | Apple may flag this in review for an app targeting ADHD/neurodivergent users specifically |
| VoiceOver labels | High | Same reasoning — accessibility scrutiny is reasonable to expect given the target audience |
| iCloud progress sync | Medium | Strongly recommended before launch, not a v2 nice-to-have |
| Home Screen / Lock Screen widget | Medium | Biggest lever for reducing start-friction; doesn't block submission but is worth prioritizing for a fast follow-up release |
| Completionist end-state | Low | Polish item — a closing celebration once all 35 figures are charted |
| Privacy policy page | **Required** | Needed for App Store Connect even though no account/data leaves the device — see Section 7 |

---

## 7. App Store Launch Checklist

### Phase 1 — Accounts & setup
- [ ] Enroll in the Apple Developer Program ($99/year) at developer.apple.com
- [ ] Create an App ID / Bundle Identifier (e.g. `com.yourname.pantheon`)
- [ ] Set up the app in App Store Connect
- [ ] Decide on a support URL and a privacy policy URL — **required even for apps with no account and no data collection.** A one-page static site stating "Pantheon stores your progress locally on your device. No personal data is collected or transmitted" is sufficient and can be hosted free on GitHub Pages or similar

### Phase 2 — Build
- [ ] Build the SwiftUI app per Section 5
- [ ] Generate the full app icon set (1024×1024 master, Xcode generates the rest) — your orbiting-star logo, ideally simplified for the small sizes
- [ ] Resolve all items in Section 6 marked High priority
- [ ] Test on multiple device sizes (the app should work well on the smallest supported iPhone, not just your own device)

### Phase 3 — Internal testing
- [ ] Distribute via TestFlight to yourself and a few others first
- [ ] Specifically test: backgrounding mid-session, force-quitting mid-session, low-storage scenarios, VoiceOver navigation end-to-end
- [ ] Iterate based on real usage — ideally including at least one person who actually has ADHD, since that's the whole point

### Phase 4 — Store listing
- [ ] App name, subtitle, and description (lead with the constellation mechanic — it's the differentiator)
- [ ] Keywords (e.g. "focus timer," "ADHD," "pomodoro," "mythology," "productivity")
- [ ] Screenshots for required device sizes (6.7" and 6.5" displays minimum) — show the constellation reveal and the Codex, since those sell the concept fastest
- [ ] Optional: a short preview video
- [ ] Age rating questionnaire (should be straightforward — no objectionable content)
- [ ] Choose pricing: Free, no in-app purchases for v1 given your stated approach

### Phase 5 — Submission
- [ ] Submit for review via App Store Connect
- [ ] Be ready to respond to reviewer questions quickly — first-time submissions sometimes get clarification requests, especially around privacy policy wording or background timer behavior
- [ ] Typical review time is 24–48 hours, though it varies

### Phase 6 — Post-launch
- [ ] Monitor crash reports and reviews closely in week one
- [ ] Have a plan for the widget and iCloud sync as a fast-follow update if not included in v1
- [ ] Consider a simple feedback channel (even just an email link) since you're not collecting any data otherwise

---

## 8. Suggested Build Order

1. Data model + static figure data (Section 3)
2. Core timer logic with the background-safe pattern (Section 4.1–4.2) — get this right before building UI on top of it
3. Focus screen + constellation drawing
4. Codex + spend-to-unlock + companion
5. Onboarding
6. Tracker
7. Theming (dark/light)
8. Accessibility pass (don't leave this for last — it's easier to build in than retrofit)
9. iCloud sync
10. Polish (milestone pulses, shooting stars, phrase rotation)
11. TestFlight → Store submission
