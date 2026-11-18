// The async boundary. Without this dynamic import, React would be consumed eagerly before
// the share scope is initialised and you'd get:
//   "Shared module is not available for eager consumption"
// Try it: replace this line with the contents of bootstrap.tsx and run `npm run dev`.
import('./bootstrap');
