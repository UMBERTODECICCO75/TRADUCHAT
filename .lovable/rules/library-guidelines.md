# TraduChat — Guidelines

## Components

The design system exports these components — import them from `@ws-6ea7fe7dc84a0e591ff5/4be5ac0b-f294-46e3-ada6-d10daec21e46` and compose them before building anything from scratch:

`AudioPlayer`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-6ea7fe7dc84a0e591ff5/4be5ac0b-f294-46e3-ada6-d10daec21e46/lib/theme` (source — preferred import)
- `@ws-6ea7fe7dc84a0e591ff5/4be5ac0b-f294-46e3-ada6-d10daec21e46/styles.css` (source — preferred import)
- `@ws-6ea7fe7dc84a0e591ff5/4be5ac0b-f294-46e3-ada6-d10daec21e46/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

