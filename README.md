# Hospital Call Panel Builder

Design, build and operate authentic hospital call systems for healthcare simulation.

**To run:** double-click `index.html` — it's fully offline, no install, no build step.
Works on laptops, large displays and tablets (press **F** or the ⛶ button for a fullscreen wall).

## The four tabs

| Tab | What it does |
|-----|--------------|
| **Simulate** | The Interactive Panel Player. Pick a room, tap the wall panels exactly where you'd press the real ones. Buttons latch and glow, LEDs flash, synthesised alarms loop until CANCEL. The Nurse Station board shows every active call hospital-wide with live timers, sorted by priority. |
| **Designer** | Figma-style drag-and-drop panel builder. Component library (Emergency, Nurse, Staff Assist, Orderly, Code Blue, MET…), shapes & hardware (circle / oval / triangle buttons, corner wedges, LEDs, barcodes, AUX strips). Select anything to edit its shape, label, colour, size, behaviour, priority and alarm sound. Flip **Test** to try it live. ⌘Z undo, arrow keys nudge, Delete removes. |
| **Sound Studio** | GarageBand for hospital alarms. Every alarm is a *recipe* of blocks (beep / chime / pulse / sweep / warble / silence) — never a recording. Tune blocks on the timeline, adjust whole-alarm feel in Simple mode, or type a description ("urgent but not an emergency") and hit Generate. |
| **Hospital** | Wards → rooms → panels. Assign any panel to any room. Load preset hospitals (Northern Beaches, Generic AU, NHS Ward, US Hospital) or export/import your whole hospital as one small `.json` — layouts, behaviours and sound recipes included. |

## Data model (everything is data-driven, nothing hard-coded)

```
Hospital
├── Sound Profiles (recipes: blocks + gap + pitch/tempo/volume)
├── Panels
│     └── Components (circle / wedge / rect / led / label / barcode / …)
│           └── Behaviour (call | cancel, priority P1–P5, latching, sound)
└── Wards → Rooms → panel references
```

Your hospital autosaves to the browser (localStorage). Export before loading a preset if you want to keep it.

## Tech

Plain HTML/CSS/JS — no dependencies. Panels are rendered as SVG with computed
wedge geometry; alarms are synthesised live with the Web Audio API.

Built June 2026 · matches the Merlon-IP panels at Northern Beaches Hospital.
