# tap-and-squish

A small Vite + TypeScript canvas project that simulates a soft dough blob with custom Verlet integration and position-based dynamics.

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

- Press and drag the dough with the mouse or touch.
- Release to let it recover gradually.

## Notes

- Physics is implemented locally with no external physics engine.
- The blob uses 32 inner ring nodes, 32 outer ring nodes, and a center node.
