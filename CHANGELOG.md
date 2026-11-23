# Changelog

All notable changes to Silcher Dart Scorer are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] – 2026-10-08

### Added
- **100+ / 140+ turn stats** — `stats.service.ts` now counts turns scoring ≥ 100 and ≥ 140 (140+ is also included in 100+). Exposed in both player stats and tournament stats endpoints.
- **Player Stats page** — new "100+ Turns" and "140+ Turns" stat cards.
- **Tournament Stats page** — new "Most 140+" and "Most 100+" leaderboard rows.
- **Leg Difference column** in standings tables (`TournamentView`, `BigScreen`) — `LD` column uses `legDifference` from `LeagueStanding`, coloured green/red/gray based on sign.
- **Board number** display in `JudgeMatch` header when `match.board` is set.
- **Double-In badge** in `JudgeMatch` — amber "Double In" badge shown when doubleIn rules are active and the current player hasn't opened yet.
- **Average** column in league standings — computed from all throw events across completed matches.
- **`doubleOut` flag** passed to `buildCheckoutDisplay` throughout (`JudgeMatch`, `SpectatorMatch`, `BigScreen`, `TournamentView`).

### Fixed
- **Score ternary bug** in `TournamentManage.tsx` — both branches of the winner/loser display were showing the same player's score.
- **`D25` / `T25` guard** in `dart-parser.ts` — invalid notations (double/triple 25) now throw a `ParseError` instead of silently computing wrong scores.
- **Empty-darts guard** in `computeTurn` (`match-engine.ts`) — now throws immediately when `darts` array is empty.
- **`liveRemaining` double-in fix** in `JudgeMatch.tsx` — darts thrown before the first double are no longer subtracted from the display remaining.
- **Missing `doubleIn` declaration** in `JudgeMatch.tsx` — `const doubleIn = matchState?.rules.doubleIn ?? false` was referenced but never declared; silent runtime error.
- **`buildCheckoutDisplay` now passes `doubleOut`** everywhere — checkout hints previously ignored the doubleOut rule.
- **Test suite** — fixed all failing specs in `match-events`, `matches`, and `tournaments` service specs.

### Changed
- Checkout table's optional `doubleOut` param returns `null` when `doubleOut` is `false`.

---

## [1.1.0] – 2026-05-19

### Added
- **Knockout bracket** — top 4 or 8 players advance from the league phase; consolation bracket gives every player a second match.
- **Import / Export / Nuke** — admin can export and import full tournament state as JSON; nuke endpoint wipes all data.
- **Quick Match** — standalone matches outside of a tournament with configurable rules (starting score, double-in/out, legs to win, sets to win).
- **Sets mode** — optional sets-to-win rule; match engine tracks `setsWon` and `legsWonInSet`.
- **Backup & Restore** — full data export/import via the admin panel.
- **Match generation** improvements — smarter round-robin scheduling avoids back-to-back matchups on the same board.
- **BigScreen** spectator view — full-screen display optimised for a projected scoreboard.
- **QR code** on the spectator view linking to the local network URL.

### Fixed
- First-run test failures after initial backend implementation.
- Improved match generation to avoid duplicate pairings.

---

## [1.0.0] – 2026-05-18

### Added
- **League phase** — round-robin scheduler, configurable matches per player, live standings.
- **Live judging** — mobile-friendly dart input pad with Double/Triple modifier buttons; only one judge per match at a time (claim/release via WebSocket).
- **Spectator view** (`TournamentView`) — live scores, checkout hints, animated match completion cards.
- **Player management** — create, list, and view players; player stats page with career averages, 180s, highest checkout, per-tournament history.
- **Event-sourced match engine** — all match state rebuilt by replaying `MatchEvent` documents; undo is always safe.
- **Checkout hints** — `buildCheckoutDisplay` shows the optimal checkout path for the current remaining score.
- **WebSocket gateway** — real-time push for match state, dart-in-progress, standings, and bracket updates.
- **NestJS backend** with MongoDB/Mongoose (Docker Compose).
- **React + Vite + Tailwind** frontend.
- **`@dart/shared`** package — shared types, enums, DTOs, and checkout table used by both apps.
- **Race condition protection** — unique compound index on `(matchId, sequence)` in `MatchEvent` schema.

---

[1.2.0]: https://github.com/stevenzieske/SilcherDartScorer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/stevenzieske/SilcherDartScorer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/stevenzieske/SilcherDartScorer/releases/tag/v1.0.0
