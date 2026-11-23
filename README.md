# OPAL COAST

An original open-world crime game built for the make.fun GTA 6 bounty. Nothing
here comes from Rockstar or any other commercial game: the city, the crew, the
story and the art are all our own.

## The game

You drive for a crew working the edge of the OCPD's patience in Opal Coast, a
sun-soaked city on the water. Dalia dispatches the jobs, Juno runs the garage,
Kiki watches the streets, and Nacho thinks he is faster than you.

- **Drive and walk** — arcade car physics with handbrake turns and a chase
  camera whose field of view opens up at top speed; hop out with `E` and
  explore on foot.
- **A living city** — 14 traffic cars looping the street grid, 26 pedestrians
  on the sidewalks, a marina, a pier, a plaza and a beach.
- **Wanted system** — 0 to 4 stars. Hit a pedestrian or a car and the heat
  rises; hide out of sight for about 8 seconds and it cools. At two stars and
  up, OCPD interceptors chase you down.
- **Missions** — a four-job chain: meet Dalia at the marina, escort the
  tanker (keep its hull above 30%), lose the tail at Juno's garage, then a
  five-checkpoint coast race against Nacho.
- **Extras** — 10 opal shards to collect (two-note chime on pickup), near-miss
  bonuses for threading traffic at speed, garage repairs, and a photo mode
  (`P`) that hides the HUD.

## Controls

WASD drive / walk · Space handbrake · E enter / exit car · P photo mode ·
Esc pause · M mute.

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8080
```

Or build the submission output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`?shot=1..4` jumps to a staged scene (for screenshots), `?selftest=1` runs
30 headless frames and logs `SELFTEST OK ...` to the console.
