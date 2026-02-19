# Test Apps

Generated test apps live here. Each is created by combining a **template** with **raw example data**.

## Usage

```bash
./create-app.sh <app-name> [template-name]
```

`template-name` defaults to `default` (from `packages/gh-templates/default/`).

### Examples

```bash
./create-app.sh gswa            # GSWA vocabs with default template
./create-app.sh ga              # GA vocabs with default template
```

## What it does

1. Copies the template into `test/<app-name>/`
2. Removes the template's `data/` and `public/export/` (replaced by example data)
3. Copies everything from `raw/<app-name>/` into the test app (data, styles, content, validators, etc.)
4. Installs dependencies and processes vocabularies
5. Starts the dev server

## Directory structure

```
test/
├── create-app.sh       # this script
├── README.md
├── gswa/               # generated (gitignored)
└── ga/                 # generated (gitignored)
```

Generated test apps are gitignored — they can always be recreated from the template + raw data.
