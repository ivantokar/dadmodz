# Contributing to DadModz

This guide covers building, packaging, and releasing the add-ons. To just play
them, see the [README](./README.md).

## 📋 Requirements

- Node.js 22 or newer
- Minecraft Bedrock on an iPhone for import and in-game testing

Install the project tools once:

```sh
npm install
```

## 🛠️ Development commands

```sh
npm run format          # Format JSON, TypeScript, and project config
npm run check           # Format, lint, type-check, and Bedrock validation
npm run script:build    # Bundle every Script API TypeScript sources for their behavior packs
npm run package         # Increment each add-on patch, then create every dist/*.mcaddon file
npm run package -- bumblebee       # Increment and package Bumblebee only
npm run package -- super-pickaxe   # Increment and package Super Pickaxe only
npm run package -- crustbreaker-pickaxe   # Increment and package Crustbreaker Pickaxe only
npm run release         # Check, then package
```

## 📦 Build and package

To build every Script API bundle without changing any pack versions, run:

```sh
npm run script:build
```

This builds each add-on source into its separate behavior-pack script:

- `scripts/src/bumblebee.ts` → `packs/bumblebee/behavior/scripts/main.js`
- `scripts/src/super-pickaxe.ts` → `packs/super-pickaxe/behavior/scripts/main.js`
- `scripts/src/crustbreaker-pickaxe.ts` → `packs/crustbreaker-pickaxe/behavior/scripts/main.js`

To create installable add-ons, run:

```sh
npm run package
```

`package` builds the scripts, validates JSON, increments each add-on's patch
version independently, synchronizes its behavior/resource manifests, and writes
one file per add-on to `dist/`:

- `bumblebee-v<version>.mcaddon`
- `super-pickaxe-v<version>.mcaddon`
- `crustbreaker-pickaxe-v<version>.mcaddon`

Run it only when you intend to create a new version: with no add-on name, it
increments every add-on.

### 🎯 Package one add-on

To bump and archive just one add-on, pass its name after `--`:

```sh
npm run package -- bumblebee
npm run package -- super-pickaxe
npm run package -- crustbreaker-pickaxe
```

The selected command changes only that add-on's manifest versions and creates
only its `.mcaddon`; each add-on remains a separate install.

## 🚀 Publish a release

Releases are automatic. Merging a change under `packs/<add-on>/` or
`scripts/src/<add-on>.ts` into `main` runs **Release add-ons**, which publishes a
`<name>-v<version>` GitHub release with the `.mcaddon` attached.

The version is the latest release of that add-on plus one patch. It is stamped only
into the built package; nothing is committed back to the protected `main` branch, so
the manifests in the repository can lag behind the released version. To re-release
manually, run the workflow from the Actions tab or
`gh workflow run release.yml -f addon=bumblebee`.

Add a new add-on by creating `packs/<name>/` (with `behavior/` and `resources/`)
and, for scripts, `scripts/src/<name>.ts`; packaging and releases discover it
automatically.

CI (`.github/workflows/ci.yml`) runs lint, type-check, JSON validation, and a full
package build on every pull request and push to `main`.

## 📜 Script API

Write future Script API sources in `scripts/src/`. `@minecraft/server` provides
the TypeScript definitions, while ESLint and the Minecraft lint rules catch common
issues before packaging.

Before shipping a Script API feature, add a JavaScript script module and matching
`@minecraft/server` dependency to the behavior-pack manifest. Pin its version to
the Minecraft version installed on the test iPhone; do not use beta APIs unless the
test device is running Minecraft Preview.

`npm run validate` runs Creator Tools' strict cooperative-add-on audit. Its current
findings document legacy content conventions and do not prevent `npm run package`
from creating the iPhone-importable add-on.

## 📱 Test a local build on iPhone

1. Build a package with `npm run package`.
2. Send the specific `.mcaddon` from `dist/` to the iPhone using AirDrop, Files,
   or another share target that offers Minecraft.
3. Tap the file and choose Minecraft. Wait for the import confirmation.
4. Create or edit a world, then enable that add-on's Behavior Pack and Resource
   Pack in the world settings before playing.

Import each add-on separately; enable the pack or packs wanted for that world.
