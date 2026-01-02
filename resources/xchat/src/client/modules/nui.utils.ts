export function sendNUIMessage(type: string, data: any) {
  SendNUIMessage({
    type,
    data,
  });
}

export function setChatFocus(visible: boolean) {
  SetNuiFocus(visible, visible);
}
