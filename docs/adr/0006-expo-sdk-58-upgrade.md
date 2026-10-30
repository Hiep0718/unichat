# ADR-0006 — Expo SDK 58 Upgrade and a Single React Native Resolution

## Status
Accepted

## Context
Expo Go on iOS could not open the project. The dev server, the LAN path and the Core API were all healthy; Expo Go rejected the project outright:

> The installed version of Expo Go is for SDK 58.0.0. The project you opened uses SDK 57.

Apple only ever serves the latest Expo Go build, and Expo states plainly that an older Expo Go cannot be installed on an iOS device. Staying on SDK 57 therefore meant no iOS testing on a physical device at all. The alternatives were an Android device (Expo Go is downloadable per-SDK there) or an EAS development build (which needs an Apple Developer account). The user chose to upgrade the project.

While upgrading, a second and more consequential problem surfaced: `npm ls react-native` reported two trees — `react-native@0.88.1` under `mobile/`, and a stale `react-native@0.86.3` hoisted at the workspace root, flagged `invalid: "0.88.1" from mobile`. Third-party component types (`@expo/vector-icons`, `@react-navigation/*`, `@ronradtke/react-native-markdown-display`, `@testing-library/react-native`) resolved their `react-native` peer against 0.86.3 while application code compiled against 0.88.1. The two versions disagree about `ColorValue` (0.88 widened it to admit `null`) and about `textAlign` (0.88 added `start`/`end`), which produced type errors that looked like application bugs but were purely a duplicate-dependency artifact.

## Decision
1. Upgrade the `mobile` workspace to Expo SDK 58 (`expo ~58.0.21`, `react-native 0.88.1`, `react 19.3.0`).
2. Pin `react-native` to a single resolution for the whole workspace via a root `overrides` entry, so every package — application and third party alike — compiles against one set of React Native types.
3. Pin `react` and `react-dom` to 19.3.0 the same way, and move the `frontend` workspace from 19.2.7 to 19.3.0 so the monorepo runs one React.
4. Declare `expo-modules-core`, and the `eslint` toolchain, explicitly in `mobile`'s dependencies.

## Reason
- **On the upgrade**: iOS device testing is a project requirement and SDK 57 cannot deliver it. The upgrade is the only option that keeps both the iPhone and Expo Go.
- **On the `overrides` pin**: npm hoisting in a workspace is free to satisfy a `*` peer range with whatever copy is already present. Leaving that to chance means the type errors return the next time the tree is rebuilt, and they return disguised as application bugs. One pinned version makes the resolution deterministic, which is what "pin dependencies" in the engineering standards asks for.
- **On the React pin**: the same hoisting freedom produced a worse failure than the type errors. npm placed an undeclared `react@19.3.1` at the workspace root beside `react-dom@19.2.7`; the frontend's own code resolved its pinned 19.2.7 from `frontend/node_modules`, but every dependency of it — `react-dom` included — resolved the root copy, and React threw `Incompatible React versions` in the browser at startup. Expo SDK 58 pins mobile to React 19.3.0, so 19.3.0 is the only version both workspaces can share; the frontend moves up a minor within React 19 rather than the mobile app moving off the version its SDK expects.
- **On `expo-modules-core`**: npm nested it under `node_modules/expo/node_modules/`, where `jest-expo` — resolved into `mobile/node_modules/` — could not reach it, and the whole test suite failed to run. A clean reinstall did not change the placement. Declaring it directly hoists it to a position both resolve against. `jest.config.js` already carries an equivalent `moduleNameMapper` workaround for `react`, so this is the established pattern in this repository rather than a new one.

## Consequences
- Four dependencies crossed a major version and required source changes:
  - `@testing-library/react-native` 13 → 14 made `render`, `fireEvent.*`, `renderHook` and `act` asynchronous. All 27 test files now `await` them.
  - `expo-router` 57 → 58 replaced the tab bar's `navigation` prop with `emitter` and `navigateToTab(routeKey)`, because `Tabs` now uses expo-router's own vendored bottom-tabs navigator instead of `@react-navigation/bottom-tabs`. `UCLiquidGlassTabBar` navigates by route key, not route name.
  - `@expo/vector-icons` 14 → 15 narrowed its `color` prop to `string | OpaqueColorValue` and its `style` prop to a single style object. `UCIcon` keeps its `StyleProp<TextStyle>` public API and flattens before delegating.
  - `jest` 29 → 30 is heavier per worker; the suite needs `--maxWorkers=2` on a 14 GB machine or workers are killed for memory.
- `ScrollView` refs use the now-exported `ScrollViewInstance` type. `React.ComponentRef<typeof ScrollView>` resolves to `never` under RN 0.88 and must not be used.
- The root `overrides` entry has to be revisited at the next React Native upgrade; it will otherwise silently hold the workspace at 0.88.1.
- The iOS bundle is ~10.9 MB in development, up from ~9.4 MB on SDK 57.
- `mobile` never declared `eslint`, `@eslint/js` or `typescript-eslint`; its lint script only worked because the frontend's copies happened to hoist to the root. A clean install nests them under `frontend/node_modules` and `npm run lint:mobile` fails with `'eslint' is not recognized`. The mobile workspace now declares them at the frontend's versions.
