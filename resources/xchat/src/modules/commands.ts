import { sendNUIMessage, setChatFocus } from "./nui.utils";

export function registerChatCommands() {
  // Key binding to open chat (T key)
  RegisterCommand(
    "+openchat",
    () => {
      setChatFocus(true);
      sendNUIMessage("toggleChat", { visible: true });
    },
    false
  );

  RegisterCommand(
    "-openchat",
    () => {
      // Key released
    },
    false
  );

  RegisterKeyMapping("+openchat", "Open Chat", "keyboard", "T");

  // Command to configure chat settings
  RegisterCommand(
    "chatconfig",
    (source: any, args: string[]) => {
      const option = args[0]?.toLowerCase();
      const value = args[1];

      if (option === "autohide") {
        const enabled = value === "true" || value === "1";
        sendNUIMessage("updateSettings", { autoHide: enabled });
        console.log(`^2[Chat] ^7Auto-hide ${enabled ? "enabled" : "disabled"}`);
      } else if (option === "duration") {
        const duration = parseInt(value);
        if (!isNaN(duration)) {
          sendNUIMessage("updateSettings", { hideDuration: duration });
          console.log(`^2[Chat] ^7Auto-hide duration set to ${duration}ms`);
        }
      } else {
        console.log("^3[Chat] ^7Usage: /chatconfig [autohide|duration] [value]");
        console.log("^3[Chat] ^7Example: /chatconfig autohide true");
        console.log("^3[Chat] ^7Example: /chatconfig duration 5000");
      }
    },
    false
  );
}
