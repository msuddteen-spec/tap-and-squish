# Tap & Squish

A mobile-first soft-body canvas game built with Vite, TypeScript, and HTML5 Canvas.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Controls

- Press, drag, or pinch the blob with the mouse or touch.
- Multi-finger interaction is supported.
- Build squish streaks to raise your combo and score.

## Notes

- Physics uses Verlet integration, PBD constraints, pressure, volume preservation, and shape matching.
- The blob is regenerated with new colors and proportions over time.
