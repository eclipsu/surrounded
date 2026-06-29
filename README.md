# Circle — Live Debate Platform

> "Middle Ground" / Jubilee-style live debate stage. One person in the center hot seat, a ring of participants around them, anyone can challenge for the mic, and the crowd can vote someone out if they're not bringing it. Built to be clip-bait for Twitter/TikTok.

## The Concept

- A **Host/Speaker** starts a debate session and proposes a topic.
- One person sits in the **center seat** (the "hot seat") — visually placed dead center of the screen.
- Up to **N other participants** are arranged in a **circle/ring** around the center seat (think: video tiles arranged radially, not a boring grid).
- Anyone in the room can **press SPACE** to challenge for the center seat.
  - On press, a **3...2...1 countdown** runs.
  - If multiple people press SPACE, there's a contention/queue mechanic (see below) — first press wins, or a quick draw mechanic, TBD.
  - When countdown hits 0, the challenger swaps into the center seat (and the previous center occupant rotates back into the ring, or gets removed depending on game mode).
- The surrounding crowd can **flag/downvote** the current center speaker.
  - If flags cross a threshold (e.g. majority of active ring members, or a raw count), the speaker gets **voted out** of the center seat automatically.
- This is designed to be **fast, chaotic, and watchable** — the kind of thing that gets clipped and shared.

## Why This Could Pop

- Jubilee-style content already performs insanely well on YouTube/Twitter/TikTok.
- This format is inherently *shareable* — clip-worthy moments happen constantly (call-outs, vote-outs, mic-drop moments).
- Low friction to join (press space, talk), high friction to leave gracefully (you get voted off) = great drama engine.
- If we get even one creator with an audience (a "Dean," a debate-bro YouTuber, a podcast host) to run a session, it could spread organically — the format itself is the marketing.

## Core Mechanics to Nail

| Mechanic | Notes / Open Questions |
|---|---|
| **Center seat swap** | Need a clean transition — fade/zoom animation, audio crossfade, not jarring |
| **SPACE to challenge** | Need debounce + anti-spam (can't mash space). Maybe a per-user cooldown after losing a challenge. |
| **Countdown (3..2..1)** | Synced across all clients — server-authoritative countdown, not client-local timers (avoid desync/cheating) |
| **Simultaneous SPACE presses** | Decide: first-server-timestamp wins? Random pick among first N ms? Queue system (next challenger auto-loads after current swap)? |
| **Flag / vote-out** | Threshold logic: % of active ring members vs raw count. Cooldown so center speaker isn't insta-voted in 2 seconds. Maybe minimum "grace period" (e.g. 30s) before votes count. |
| **Ring layout** | Circular video tile arrangement, responsive to ring size (6 people vs 19 people circle differently) |
| **Spectators vs Ring members** | Are there people who just watch (no mic, no vote) vs active ring participants (mic-eligible, can vote)? Probably yes — spectators >> active ring slots. |
| **Moderation** | Who can mute/kick outright (host powers) vs democratic vote-out? Need both. |

## Tech Stack

- **LiveKit** — handles all real-time audio/video (the actual debate audio, video tiles, screen presence)
- **Express.js** — backend for room orchestration, auth, vote tallying, countdown state machine, LiveKit token issuance
- **Socket.io** (or LiveKit data channels) — for low-latency game-state events: countdown ticks, vote counts, seat swaps, flags
- **Postgres/Redis** — Redis is probably essential here for ephemeral, high-frequency state (votes, queue, countdown) since this is much more "live game state" than "persistent chat app"
- **Frontend** — React, with a custom radial/circular layout renderer for video tiles (this is the most visually distinctive piece — worth getting right)

## High-Level Architecture

```
Client (React)
   │
   ├── LiveKit SDK ──────────────► LiveKit Server (audio/video tiles)
   │
   └── Socket.io ────────────────► Express + Redis
                                      ├── Room/session state machine
                                      ├── Countdown authority (server clock)
                                      ├── Vote/flag tally + threshold logic
                                      ├── Seat assignment (center vs ring vs spectator)
                                      └── LiveKit token + permission grants (mic on/off based on seat)
```

### Why Express + Redis over just LiveKit

LiveKit gives you the audio/video pipes. It does **not** give you:
- Game-state logic (who's in the center, vote counts, countdown sync)
- Seat-based permission switching (only center seat can publish audio? or can ring members talk too?)
- Vote-out thresholds and cooldowns

So Express + Redis becomes the **referee** — it decides who gets a LiveKit token with `canPublish: true` for the center seat, and revokes/reissues that permission live as seats swap.

## Room / Seat State Machine (rough sketch)

```
States per room:
  - WAITING        (host hasn't started yet)
  - TOPIC_PROPOSED  (host announces topic)
  - ACTIVE_DEBATE   (center seat occupied, ring can challenge/flag)
  - COUNTDOWN       (someone pressed SPACE, 3..2..1 running)
  - SEAT_SWAP       (countdown hit 0, swapping center occupant)
  - VOTE_OUT        (flag threshold hit, removing center occupant)
```

Each transition is server-authoritative — broadcast via Socket.io to all clients so animations/timers stay in sync. Never trust client-side countdowns for anything that affects game state.

## MVP Scope (v0)

To ship something testable fast, cut scope to:

1. One room, one topic, fixed ring size (e.g. 8 ring slots)
2. Center seat + ring, no spectator tier yet
3. SPACE to challenge → server countdown → swap (first-press-wins, no fancy queue)
4. Flag button → raw count threshold (e.g. 5 flags) → auto vote-out
5. Basic radial video layout (CSS, not canvas/WebGL — keep it simple first)
6. Host controls: start topic, force-kick, end session

**Punt to v1+:** spectator mode, queue system for simultaneous challenges, clip/export tool (huge for virality — letting people clip a moment straight to a shareable video is probably worth its own workstream), persistent accounts/history, multiple simultaneous rooms/discovery, mobile layout.

## Open Questions / Decisions Needed

- [ ] What happens to the person voted out — do they go back in the ring, or are they removed from the session entirely (for that topic)?
- [ ] Can ring members talk at all, or only the center seat has a live mic (others muted until they win the seat)?
- [ ] Is there a time limit on how long someone can hold center seat regardless of votes?
- [ ] Anonymous join vs account required? (Lower friction = more virality, but also more trolling)
- [ ] Clip/export feature — this might be the single highest-leverage feature for actually getting shared on Twitter
- [ ] Max ring size — visually, how many tiles can a circle hold before it looks bad / how do we degrade gracefully at scale (the "19 people" case)?

## Phase 1 (current)

Foundation for multi-room voice/video chat:

- [x] Ask user's display name (stored locally)
- [x] Create a room with configurable capacity
- [x] Shareable invite link (`/room/:id`)
- [x] Join via link and talk (LiveKit audio/video)
- [x] Multiple rooms can exist simultaneously

### Run locally

```bash
# 1. Start LiveKit
docker compose up livekit -d

# 2. Install deps
npm install

# 3. Copy env (optional — defaults work with docker dev LiveKit)
cp .env.example server/.env

# 4. Start app
npm run dev
```

Open http://localhost:5173 — enter your name, create a room, copy the invite link, open it in another tab/browser to test.

## Next Steps

1. Lock MVP scope (above) and ring size
2. Build the server-authoritative state machine in Express + Redis
3. Prototype the radial video layout in isolation (this is the part most likely to take longer than expected)
4. Wire LiveKit token permissions to seat state
5. Internal test with a small group before any public/Twitter push
