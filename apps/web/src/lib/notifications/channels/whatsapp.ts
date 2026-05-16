import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";

import { createLogger } from "~/lib/observability/logger";
import type { NotificationChannel, NotificationMessage } from "../types";

const logger = createLogger("notification:whatsapp");

type WASocket = ReturnType<typeof makeWASocket>;

class WhatsAppClient {
  private sock: WASocket | null = null;
  private connected = false;

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
      },
      logger: P({ level: "silent" }),
      printQRInTerminal: true,
      markOnlineOnConnect: false,
    });

    this.sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        this.connected = true;
        logger.info("whatsapp_connected");
      }
      if (connection === "close") {
        this.connected = false;
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          logger.warn("whatsapp_reconnecting", { code });
          void this.connect();
        } else {
          logger.error("whatsapp_logged_out");
        }
      }
    });

    this.sock.ev.on("creds.update", saveCreds);
  }

  async sendMessage(phone: string, text: string): Promise<void> {
    if (!this.sock || !this.connected) throw new Error("WhatsApp not connected");
    const jid = `51${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
    logger.info("whatsapp_sent", { phone });
  }
}

export const whatsappClient = new WhatsAppClient();

export const whatsappChannel: NotificationChannel = {
  id: "whatsapp",
  contactField: "phone",
  async init() {
    await whatsappClient.connect();
  },
  async send(to: string, message: NotificationMessage): Promise<void> {
    await whatsappClient.sendMessage(to, message.body);
  },
};
