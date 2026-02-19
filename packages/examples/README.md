# Examples

Example vocabulary datasets for testing prez-lite templates.

## Structure

```
examples/
├── raw/                # Raw example data (source of truth)
│   ├── gswa/           # Geological Survey of Western Australia
│   └── ga/             # Geoscience Australia
└── test/               # Generated test apps (gitignored)
    └── create-app.sh   # Creates a test app from template + raw data
```

## How it works

Each **raw example** contains the minimum files needed on top of a template — data, styles, content overrides, validators, etc. The `test/create-app.sh` script combines a template (from `packages/gh-templates/`) with a raw example to create a runnable test app.

```bash
cd test
./create-app.sh gswa        # creates test/gswa/ from default template + raw/gswa/
```

See [test/README.md](test/README.md) for full usage.
