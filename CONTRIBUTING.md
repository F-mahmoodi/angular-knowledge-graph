# Contributing

Thanks for your interest!

1. `npm ci`
2. `npm start` runs the demo against the library sources; edit files under `projects/ngx-constellation/src/lib`.
3. `npm test` must pass, and `npm run build` must succeed.
4. Keep the engine (`engine.ts`, `graph.ts`) free of Angular imports — it is framework-agnostic on purpose.
5. Run `npm run format` before committing.

Please open an issue first for larger changes.
