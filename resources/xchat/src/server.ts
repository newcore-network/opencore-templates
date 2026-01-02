import { Server } from "@open-core/framework";
import './server/chat.controller'

// Initialize OpenCore in RESOURCE mode
Server.init({
  mode: "RESOURCE",
  coreResourceName: "core",
  features: {
    // REQUIRED for chat
    players: { enabled: true, provider: "core", /* Use core's player registry*/},
    netEvents: { enabled: true},
    chat: { enabled: true, export: true},
    commands: { enabled: true, provider: 'core'},
    exports: { enabled: true, /* Enable exports for other resources */},
  }
})
  .then(() => {
    console.log("[xchat] Chat system initialized successfully");
  })
  .catch((error) => {
    console.error("[xchat] Failed to initialize:", error);
  });
