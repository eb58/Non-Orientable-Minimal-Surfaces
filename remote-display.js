import { REMOTE_RELAY_URL } from "./remote-config.js";
import {
  PUBLIC_REMOTE_SECRET, randomToken, remoteCredentialsHash, sanitizeRemoteCommand, websocketUrl
} from "./remote-protocol.js";

const QR_MODULE = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";

export const createRemoteDisplay = ({ onCommand }) => {
  const dialog = document.querySelector("#remote-dialog");
  const openButton = document.querySelector("#remote-open");
  const closeButton = document.querySelector("#remote-close");
  const newButton = document.querySelector("#remote-new-session");
  const status = document.querySelector("#remote-status");
  const link = document.querySelector("#remote-link");
  const canvas = document.querySelector("#remote-qr");
  const viewerNav = dialog.closest(".viewer-nav");
  let socket = null;
  let reconnectTimer = 0;
  let generation = 0;
  const setPeerConnected = connected => {
    dialog.dataset.connected = String(connected);
    if (viewerNav) viewerNav.dataset.remoteConnected = String(connected);
  };

  const closeSocket = () => {
    clearTimeout(reconnectTimer);
    generation += 1;
    socket?.close();
    socket = null;
  };
  const tvMode = document.documentElement.classList.contains("tv");
  const userAgent = navigator.userAgent || "";
  const mobileMode = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  if (!tvMode && mobileMode) return { start: () => {}, close: closeSocket };

  const start = async ({ keepExpanded = false } = {}) => {
    closeSocket();
    dialog.hidden = false;
    setPeerConnected(false);
    if (!keepExpanded) dialog.classList.toggle("expanded", tvMode);
    if (!REMOTE_RELAY_URL) {
      status.textContent = "Der Relay ist noch nicht konfiguriert. Trage seine URL in remote-config.js ein.";
      canvas.hidden = true;
      link.hidden = true;
      return;
    }
    canvas.hidden = false;
    link.hidden = false;
    const currentGeneration = generation;
    const room = randomToken(6);
    const secret = PUBLIC_REMOTE_SECRET;
    const controllerUrl = new URL("remote.html", location.href);
    controllerUrl.hash = remoteCredentialsHash(room);
    link.href = controllerUrl.href;
    link.textContent = controllerUrl.href;
    status.textContent = "QR-Code mit dem Smartphone scannen";
    try {
      const { default: QRCode } = await import(QR_MODULE);
      await QRCode.toCanvas(canvas, controllerUrl.href, { width: 148, margin: 1, errorCorrectionLevel: "L" });
    } catch {
      canvas.hidden = true;
      status.textContent = "QR-Code konnte nicht geladen werden. Öffne den Link auf dem Smartphone.";
    }

    const connect = () => {
      if (currentGeneration !== generation) return;
      socket = new WebSocket(websocketUrl(REMOTE_RELAY_URL, room, "display", secret));
      socket.addEventListener("message", event => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === "peer-connected") {
          setPeerConnected(true);
          status.textContent = "Smartphone verbunden";
          return;
        }
        if (message.type === "peer-disconnected") {
          setPeerConnected(false);
          dialog.classList.add("expanded");
          status.textContent = "Verbindung zum Smartphone getrennt";
          return;
        }
        const command = sanitizeRemoteCommand(message);
        if (command) onCommand(command);
      });
      socket.addEventListener("close", () => {
        if (currentGeneration !== generation || dialog.hidden) return;
        setPeerConnected(false);
        status.textContent = "Relay-Verbindung wird wiederhergestellt …";
        reconnectTimer = setTimeout(connect, 1500);
      });
    };
    connect();
  };

  openButton?.addEventListener("click", () => start({ keepExpanded: true }));
  dialog.addEventListener("click", event => {
    if (event.target.closest("button, a")) return;
    dialog.classList.toggle("expanded");
  });
  newButton.addEventListener("click", () => start({ keepExpanded: true }));
  closeButton?.addEventListener("click", () => { dialog.hidden = true; closeSocket(); });
  start();
  return { start, close: closeSocket };
};
