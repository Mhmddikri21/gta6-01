[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mhmddikri21/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mhmddikri21/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# OPAL COAST

An original open-world crime game built for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01) — a sun-soaked coastal city you explore on foot and by car, with traffic, pedestrians, a wanted level, police chases, missions and a story. Nothing here comes from Rockstar or any other commercial game: the city, the characters and the story are all our own.

## The story

You are the wheel for Dalia's crew in Opal Coast, a city on the bay. Dalia dispatches the jobs, Juno keeps your car alive at her garage, Kiki watches the streets, and Nacho plans the getaways. Run the jobs, stay ahead of the OCPD, and don't get caught standing still.

## What is in the game

- **Open city** — a road grid of pastel blocks, a beach, a marina full of moored boats, and a long pier out to sea, all built with Three.js.
- **Driving** — arcade car physics with acceleration, braking, steering and a handbrake drift; the chase camera's field of view opens from 62° to about 71° at top speed.
- **Traffic and pedestrians** — 14 AI cars cruising the grid and 26 pedestrians on the sidewalks who scatter when you bear down on them.
- **Wanted system** — 0 to 4 stars. Hitting a pedestrian or a car, or speeding past the police, raises the heat; hide out of sight for 8 seconds and it cools. At 2+ stars OCPD interceptors with flashing light bars chase and ram you; get held while crawling and you are busted.
- **Missions** — a three-job chain: m1 pick up Dalia's package, m2 escort Juno's tanker across town while rivals ram it (the game warns you once when its hull drops below 30%), m3 a four-star getaway through three checkpoints.
- **Collectibles** — 10 opal shards hidden around the map; each one plays a two-note ascending chime and pays $25.
- **Near-miss bonus** — thread past a traffic car at over 20 m/s without touching it for +$10 and a blip.
- **Garage repair** — park on Juno's teal pad and hold still to repair the car.
- **HUD** — cash, wanted stars, speed, damage, mission objective, and a live minimap with the player, traffic, police, tanker, shards and the mission beacon. F toggles photo mode (hides the HUD), P pauses.

## How to run it

```sh
node serve.ts --port 8080
# open http://localhost:8080/
```

Click to start. WASD / arrows drive, Space is the handbrake, E enters and exits the car, F is photo mode, P pauses.

## Screenshots

The four images in `screenshots/` are real renders of the game, staged with `?shot=1..4` (see `shots.json` for what each one shows).

## How it is handed in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the kit's `buildDossier`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
