# Paseo Finder Links

Reveal local file links from Paseo in the operating system's file manager. The plugin selects files
in macOS Finder or Windows File Explorer, while web links and source references such as
`src/app.ts:42` keep Paseo's native behavior.

## Installation

Enable plugins in Paseo under **Settings > Plugins**, then install the public Git repository:

```bash
paseo plugin add npm:paseo-finder-links@0.1.0
paseo plugin ls paseo-finder-links
```

Paseo plugins are trusted, unsandboxed code. Review this repository before installing it.

## Behavior

The client intercepts only unmodified primary clicks on local-file anchors rendered by assistant
messages. The daemon then:

1. resolves relative paths against the active agent or workspace;
2. verifies that the target exists;
3. invokes the native file manager with separated arguments and no shell.

| Platform | File | Directory |
| --- | --- | --- |
| macOS | Selected in Finder with `/usr/bin/open -R` | Revealed in Finder |
| Windows | Selected in File Explorer with `explorer.exe /select,PATH` | Opened in File Explorer |

Windows drive paths, `file:///C:/...` URLs, paths containing spaces, and UNC `file://server/share/...`
URLs are supported.

## Known limitations

- Linux is not supported in version 0.1.0.
- The click integration is available in Paseo's web-based desktop client, not native mobile clients.
- Source-position links remain inside Paseo by design.

## Development

```bash
npm ci
npm test
npm run typecheck
```

CI runs the test and typecheck suite on both macOS and Windows.

## License

MIT
