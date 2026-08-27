# DadModz

Minecraft Bedrock add-ons: Bumblebee and Super Pickaxe.

## Requirements

- Node.js 22 or newer
- Minecraft Bedrock on an iPhone for import and in-game testing

Install the project tools once:

```sh
npm install
```

## Development commands

```sh
npm run format          # Format JSON, TypeScript, and project config
npm run check           # Format, lint, type-check, and Bedrock validation
npm run script:build    # Bundle both Script API TypeScript sources for their behavior packs
npm run package         # Increment each add-on patch, then create both dist/*.mcaddon files
npm run release         # Check, then package
```

Import the generated `.mcaddon` file into Minecraft on the iPhone using AirDrop,
Files, or any other share target that offers Minecraft.

## Script API

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
