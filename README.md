# Paseo Finder Links

Plugin locale per Paseo su macOS. Un clic su un link a un file locale senza numero di riga lo
mostra nel Finder con `open -R`. I link web e i riferimenti sorgente come `src/app.ts:42` conservano
il comportamento nativo di Paseo.

Il client intercetta soltanto gli anchor usati dal renderer dei file dell'assistente. Il server
risolve i percorsi relativi rispetto all'agente o al workspace corrente, verifica che il percorso
esista e invoca `/usr/bin/open` con argomenti separati, senza shell.

## Verifica

```bash
npm test
npm run typecheck
paseo plugin ls paseo-finder-links --json
```
