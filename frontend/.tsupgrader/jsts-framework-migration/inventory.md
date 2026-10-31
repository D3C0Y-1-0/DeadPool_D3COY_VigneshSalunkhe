# Framework migration inventory

## Scope and baseline

- Repository: `C:\Users\vighn\Desktop\D3DCOY`
- Package: `frontend`
- Source: Vite 5 + React 18 + React Router 6 + Tailwind CSS 4
- Target: Next.js App Router, in the same `frontend` package
- Reference: `refernce dash` is a separate Next.js dashboard; its domain/API/data are not part of this migration.
- Source baseline state: pristine application baseline. No source files or dependency manifests were changed before validation.
- Baseline command: `typescript_validate_runtime`, standalone mode, using the HTTP-probe fallback (browser recording was declined).
- Baseline result: `.tsupgrader/runtime-validation/standalone-result.json`; 3 passed, 0 failed, 0 skipped. The exact result is copied to `.tsupgrader/jsts-framework-migration/source-baseline-result.json`.
- No frontend test script or frontend test files existed in the source package.

## Source framework topology

| Unit | Exact count | Source |
|---|---:|---|
| Routed page components | 4 | `/`, `/incident/:id`, `/attackers`, `/attack` in `src/App.tsx` |
| Shared dashboard components | 11 | `src/components/*.tsx` |
| Shared data modules | 3 | `src/api.ts`, `src/types.ts`, `src/useLive.ts` |
| Mock fixtures | 1 | `src/mock/incident.json` |
| Vite entry points | 2 | `index.html`, `src/main.tsx` |
| Tests | 0 | No frontend test script or test files |

The reference dashboard contains a separate Next.js App Router and unrelated product screens. Only its navigation, health/status framing, and information-density patterns are visual references; MIRAGE page behavior and data contracts remain authoritative.

## Integrations and observable behavior

- Vite dev server: port `5173`, host binding, `/api` proxy to `http://localhost:8000`, `/ws` WebSocket proxy to `ws://localhost:8000`.
- Build: `pnpm run build` runs TypeScript no-emit checking followed by `vite build`.
- Preview: `pnpm run preview` starts the Vite production preview.
- API module: REST access for stats, events, incidents, actions, ATT&CK matrix, exports, and demo triggers.
- Live state: `useLive` opens `/ws/live`, reconnects after disconnect, and refreshes REST data.
- Existing navigation: React Router client routes; incident detail path is `/incident/:id`.
- Deployment: Docker Compose builds `frontend/Dockerfile`, serves an Nginx static bundle on port 80, and maps host port `5173`.
- CI consumers: no GitHub workflow or other CI consumer was found referencing frontend build output or commands.

## Known source limitations

- The ATT&CK page includes hard-coded fallback technique rows, and incident detail can show a mock incident. These are sample UI paths, not backend records; the target will show explicit loading, empty, and error states instead of presenting fabricated data.
- The source WebSocket and API proxy behavior must remain usable in local development and Compose.
- Existing lint/test scripts were absent. This migration adds focused frontend regression tests and a deterministic `test` command.

## Contract changes

| Contract | Source value | Target value | Why required | Alternatives considered | Validation evidence | Approval status |
|---|---|---|---|---|---|---|
| UI framework and route ownership | Vite SPA + React Router 6 | Next.js App Router | Explicit user request; target must own all dashboard routes | Keep Vite, or serve Next beside Vite | Source build and home probe passed; target route probes pending | approved change |
| Development/start/preview commands | `dev=vite`, `build=tsc && vite build`, `preview=vite preview` | Next.js `dev`, `build`, `start`/`preview` | Next.js must own local app runtime and production rendering | Keep Vite as a second app | Source baseline captured; target command parity pending | approved change |
| Production image/output | Static Vite `dist` served by Nginx | Next.js standalone Node server | App Router rendering and runtime rewrites require a Node server | Static export (does not preserve required dynamic/server behavior) | Compose build and runtime check pending | approved change |
| Host dashboard port | `5173` | `5173` | Preserve existing Compose and demo URL | Change to Next default port 3000 | Target dev/prod endpoint checks pending | preserved |
| Minimum Node version | README says Node.js 20+; package has no `engines` field | Next.js 16 requires Node.js >=20.9 | Required by the selected supported Next.js major | Next.js 15 (maintenance support ends 2027-01-31); remain on Vite | Target build on Node 22.2 only; minimum-version validation pending | unapproved |
| React / graph packages | React 18; `reactflow` 11 | React 19; `@xyflow/react` 12 (if required by Next 16 peer/runtime compatibility) | Next 16 runtime compatibility and React Flow support | Next.js 15 with current React/React Flow versions | Dependency install, typecheck, and graph render pending | approved change |
| Data presentation | API data, plus fallback mock incident/techniques | Backend data only; explicit loading/error/empty states | User requested real, non-fabricated dashboard content | Keep mock fallback | REST/API tests and live endpoint behavior pending | approved change |

