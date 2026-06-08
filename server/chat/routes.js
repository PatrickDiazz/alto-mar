import { z } from "zod";
import { query, pool } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  getChatMeta,
  listChatMessages,
  sendChatMessage,
  markChatRead,
  getUnreadSummary,
} from "./messages.js";
import { notifyBookingMessage } from "./events.js";
import { notifyAsync } from "../notifications/bookingEvents.js";

const sendBodySchema = z.object({
  body: z.string().min(1).max(2000),
});

function chatError(res, status, code, message) {
  return res.status(status).json({ code, message });
}

/**
 * @param {import('express').Express} app
 */
export function installBookingChatRoutes(app) {
  app.get("/api/chat/unread-summary", requireAuth, async (req, res) => {
    try {
      const summary = await getUnreadSummary(query, req.user.sub);
      return res.json(summary);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar mensagens.";
      return res.status(500).send(msg);
    }
  });

  app.get("/api/bookings/:id/chat/meta", requireAuth, async (req, res) => {
    try {
      const result = await getChatMeta(query, req.params.id, req.user.sub);
      if (result.error === "not_found") {
        return res.status(404).send("Reserva não encontrada.");
      }
      return res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar chat.";
      return res.status(500).send(msg);
    }
  });

  app.get("/api/bookings/:id/chat/messages", requireAuth, async (req, res) => {
    try {
      const since = typeof req.query.since === "string" ? req.query.since : null;
      const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const result = await listChatMessages(query, req.params.id, req.user.sub, { since, limit });
      if (result.error === "not_found") {
        return res.status(404).send("Reserva não encontrada.");
      }
      if (result.error === "not_available") {
        return chatError(
          res,
          403,
          "CHAT_NOT_AVAILABLE",
          "O chat só está disponível para reservas confirmadas."
        );
      }
      return res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao listar mensagens.";
      return res.status(500).send(msg);
    }
  });

  app.post("/api/bookings/:id/chat/messages", requireAuth, async (req, res) => {
    try {
      const body = sendBodySchema.parse(req.body ?? {});
      const result = await sendChatMessage(query, pool, req.params.id, req.user.sub, body.body);
      if (result.error === "not_found") {
        return res.status(404).send("Reserva não encontrada.");
      }
      if (result.error === "read_only") {
        return chatError(
          res,
          403,
          "CHAT_READ_ONLY",
          "Esta conversa está encerrada; só pode consultar o histórico."
        );
      }
      if (result.error === "content_blocked") {
        return chatError(
          res,
          400,
          "CHAT_CONTENT_BLOCKED",
          "Não é permitido partilhar contactos ou links. Use o chat apenas para combinar detalhes do passeio."
        );
      }
      if (result.error === "rate_limit") {
        return chatError(res, 429, "CHAT_RATE_LIMIT", "Aguarde um momento antes de enviar outra mensagem.");
      }

      notifyAsync(() =>
        notifyBookingMessage({
          bookingId: req.params.id,
          senderUserId: req.user.sub,
          previewBody: result.previewBody,
        })
      );

      return res.status(201).json({ message: result.message });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return chatError(res, 400, "CHAT_INVALID_BODY", "Mensagem inválida.");
      }
      const msg = e instanceof Error ? e.message : "Erro ao enviar mensagem.";
      return res.status(500).send(msg);
    }
  });

  app.post("/api/bookings/:id/chat/read", requireAuth, async (req, res) => {
    try {
      const result = await markChatRead(query, req.params.id, req.user.sub);
      if (result.error === "not_found") {
        return res.status(404).send("Reserva não encontrada.");
      }
      if (result.error === "not_available") {
        return chatError(
          res,
          403,
          "CHAT_NOT_AVAILABLE",
          "O chat só está disponível para reservas confirmadas."
        );
      }
      return res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao marcar mensagens como lidas.";
      return res.status(500).send(msg);
    }
  });
}
