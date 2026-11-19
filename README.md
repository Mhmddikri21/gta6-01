# OPAL COAST — an open-world crime story

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mhmddikri21/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mhmddikri21/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

An entry for [Make GTA 6 on make.fun](https://make.fun/c/gta6-01): a complete,
original open-world crime game that plays offline in a desktop browser from
static files — no network, no build step.

## The game

The Hydration Union cut the water and blamed the docks. Mero "Slick" Vance,
ex water-hauler turned wheelman for fixer Dalia Kade, has six jobs to take
Opal Coast back: plant a badge at the desal plant, wreck a Union tanker,
vanish from the OCPD, deliver a flatbed of filters, sweep the marina on foot,
and outrun rival Nacho Reyes down the coastal highway.

- **A city to explore** on foot and by car: a road grid, a coastal boulevard,
  a beach, a pier and a lighthouse, traffic and pedestrians, palms and sunset.
- **Cars to steal and drive** — walk up to any car, press E, and it is yours.
  Arcade handling, handbrake drifts, wrecks and repairs at the garage.
- **A wanted level and police who respond** — 5 stars, OCPD interceptors that
  ram, a helicopter with a spotlight from 3 stars, and heat that cools only
  when you break line of sight.
- **Missions and a story** — six staged jobs with dialogue, objective beacons
  and rewards, plus cash, respect ranks, a weapon wheel and a garage.
- **A HUD with a minimap** — mission card, OCPD dispatch list, health and
  armour, crew panel, speed and car condition, district name, clock and a
  three-station synth radio (WebAudio, no audio files).
- **Start screen and save** — P saves to the browser, Continue loads it back.

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome, or run `node serve.ts` and open http://localhost:8080.

- WASD move / drive · SHIFT run · E steal / exit car · SPACE handbrake
- F punch · CLICK shoot · 1–4 weapons · M next job · R radio · P save · ESC pause

## Structure

- `game/index.html` — page, HUD and menus
- `game/src/config.js` — city, story, missions, ranks, cars, radio
- `game/src/world.js` — the three.js city (sky, ocean, roads, buildings, palms, pier)
- `game/src/player.js` — on-foot and driving controls, camera, health
- `game/src/traffic.js` — traffic cars and pedestrians
- `game/src/police.js` — wanted system, pursuit cars, helicopter
- `game/src/missions.js` — the six-job story state machine
- `game/src/audio.js` — synthesized sound effects and radio (WebAudio)
- `game/src/hud.js` — HUD, minimap, menus, save/load
- `game/src/shots.js` — screenshot staging (real playable states via `?shot=N`)
- `game/src/main.js` — boot and frame loop
- `game/vendor/three.min.js` — vendored three.js (UMD build)
- `main.ts` — the make.fun entrypoint: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`

Everything is original: our own city, characters, vehicles, names, story,
art, sounds and music. Nothing from any commercial game.
