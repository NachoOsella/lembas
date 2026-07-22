# Dietetica Lembas — Thesis Defense Deck

A Spanish Presenterm deck designed for a 6–7 minute oral defense, followed by a live application demonstration. It emphasizes business value, end-to-end operational flows, and verifiable reliability rather than interface details.

## Contents

- `defensa-tesis-lembas-presentacion.md`: slides and speaker notes.
- `defensa-tesis-gruvbox-dark.yaml`: custom theme derived from the Presenterm skill's `terminal-noir.yaml`, extending `gruvbox-dark`.
- `presenterm-defensa.yaml`: viewport, fade transition, and export settings.

## Present

From `docs/08-academic/presentacion-defensa`:

```bash
presenterm \
  --config-file presenterm-defensa.yaml \
  --present defensa-tesis-lembas-presentacion.md
```

For rehearsal with hot reload, omit `--present`:

```bash
presenterm \
  --config-file presenterm-defensa.yaml \
  defensa-tesis-lembas-presentacion.md
```

Use `T` to inspect the layout grid and `?` to view keyboard shortcuts.

## Speaker notes

The deck includes concise Spanish speaker notes with timing and transitions. In two terminals:

```bash
presenterm \
  --config-file presenterm-defensa.yaml \
  --publish-speaker-notes defensa-tesis-lembas-presentacion.md
```

```bash
presenterm \
  --config-file presenterm-defensa.yaml \
  --listen-speaker-notes defensa-tesis-lembas-presentacion.md
```

## Export

```bash
presenterm \
  --config-file presenterm-defensa.yaml \
  --export-html defensa-tesis-lembas-presentacion.md \
  --output defensa-tesis-lembas.html
```

## Live demo handoff

The closing slide transitions to the demonstration. Prepare a data set that shows: a received lot with an expiration date, an open cash session, a POS sale or an online paid order, and the resulting stock movement or order traceability. This preserves the talk's central claim: one shared commercial core keeps both sales channels consistent.

## Validation

```bash
/home/nacho/.pi/agent/skills/presenterm/scripts/validate.sh \
  defensa-tesis-lembas-presentacion.md presenterm-defensa.yaml
```
