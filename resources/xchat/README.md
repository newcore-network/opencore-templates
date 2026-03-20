# xChat - Multi-Platform OpenCore Chat

xChat is a modern chat resource for the OpenCore framework built around the framework's current runtime abstractions.

## Highlights

- Multi-platform template for `fivem`, `redm`, and `ragemp`
- Uses OpenCore `WebView` and `@Client.OnView(...)` instead of direct NUI globals
- Uses framework key mapping decorators instead of runtime-specific command glue
- Uses transport abstractions for client-to-server command execution
- Uses framework exports for integrations and engine events for local server hooks
- Includes a browser-friendly UI with command history, inline colors, and proximity fading

## Compatibility

`xchat` publishes `oc.manifest.json` and currently declares support for:

- `fivem`
- `redm`
- `ragemp`

Game profile compatibility is declared as `common` because the resource logic only relies on framework abstractions.

## Installation

```bash
opencore clone xchat
```

If you are adding it manually, place it under `resources/xchat` and ensure your project includes `./resources/*` in `opencore.config.ts`.

## Commands

### Player Commands

| Command | Description | Format |
|---------|-------------|--------|
| `/say` | Normal chat message | `/say [message]` |
| `/me` | Third-person action | `/me [action]` |
| `/do` | Environmental description | `/do [description]` |
| `/ooc` | Global out-of-character chat | `/ooc [message]` |
| `/b` | Local out-of-character chat | `/b [message]` |
| `/pm` | Private message to a player | `/pm [id] [message]` |
| `/shout` | Shout message with larger radius | `/shout [message]` |
| `/whisper` | Whisper message with shorter radius | `/whisper [message]` |
| `/clear` | Clear your local chat window | `/clear` |

### Staff Commands

| Command | Description | Format |
|---------|-------------|--------|
| `/announce` | Server-wide announcement | `/announce [message]` |

## Developer API

### Exports

```ts
exports.xchat.sendChatMessage('Hello World', 'SYSTEM', 255, 255, 255)

exports.xchat.sendSpatialMessage({
  message: 'Stay back!',
  author: 'Guard NPC',
  radius: 20,
  color: { r: 255, g: 120, b: 120 },
  source: {
    id: 'npc:guard-01',
    kind: 'npc',
    name: 'Guard NPC',
    position: { x: 100.0, y: 200.0, z: 30.0 },
    dimension: 0,
  },
})
```

### Local Server Hook

`xchat` emits a local engine event for integrations:

```ts
// Example: listen inside another OpenCore server resource
engineEvents.on('xchat:onMessage', (payload) => {
  // payload: { source, message, command }
})
```

## Notes

- The UI is driven through the framework WebView bridge.
- The template still ships `fxmanifest.lua` for CFX runtimes, while RageMP builds use the adapter-defined resource layout.
- Player settings are kept client-side in local storage.
