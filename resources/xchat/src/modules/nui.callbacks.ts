import { sendNUIMessage, setChatFocus } from "./nui.utils";

export function registerChatCallbacks() {
  RegisterNuiCallback(
    "sendMessage",
    (data: { message: string }, cb: (response: any) => void) => {
      const message = data.message.trim();

      if (!message) {
        cb({ ok: false });
        return;
      }

      if (message.startsWith("/")) {
        const parts = message.slice(1).split(" ");
        const command = parts[0];
        const args = parts.slice(1);

        emitNet("core:execute-command", command, args);
      } else {
        emitNet("core:execute-command", "say", [message]);
      }

      cb({ ok: true });
    }
  );

  RegisterNuiCallback("closeChat", (data: any, cb: (response: any) => void) => {
    setChatFocus(false);
    sendNUIMessage("toggleChat", { visible: false });
    cb({ ok: true });
  });
}
