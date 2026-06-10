import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  authenticateStaff,
  requireStaffAuth,
  requireStaffPermission,
  signStaffToken,
  staffCan,
} from "./auth.js";
import { writeAuditLog, listAuditLogs } from "./audit.js";
import {
  createTicket,
  listTickets,
  getTicketById,
  listTicketMessages,
  addTicketMessage,
  updateTicket,
  userCanAccessTicket,
} from "./tickets.js";
import {
  listBoatReviewQueue,
  getBoatReviewDetail,
  approveBoat,
  rejectBoat,
  markBoatUnderReview,
  suspendBoat,
} from "./boats.js";
import {
  listModerationCases,
  createModerationCase,
  applyModerationAction,
  listChatReports,
  createChatReport,
  resolveChatReport,
  listBookingMessagesForStaff,
  searchChatMessages,
} from "./moderation.js";
import { getDashboardMetrics } from "./dashboard.js";
import { listMacros, createMacro, updateMacro, ensureDefaultMacros } from "./macros.js";
import { listTags, createTag, addTagToTicket, removeTagFromTicket } from "./tags.js";

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createTicketSchema = z.object({
  type: z.enum([
    "CUSTOMER_SUPPORT",
    "HOST_SUPPORT",
    "TECHNICAL",
    "FINANCIAL",
    "BOOKING_ISSUE",
    "COMPLAINT",
  ]),
  subject: z.string().min(3).max(200),
  body: z.string().min(1).max(8000),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  relatedBookingId: z.string().uuid().optional().nullable(),
  relatedBoatId: z.string().uuid().optional().nullable(),
});

const ticketMessageSchema = z.object({
  body: z.string().min(1).max(8000),
});

const updateTicketSchema = z.object({
  status: z
    .enum([
      "OPEN",
      "WAITING_STAFF",
      "WAITING_CUSTOMER",
      "WAITING_HOST",
      "IN_PROGRESS",
      "ESCALATED",
      "RESOLVED",
      "CLOSED",
    ])
    .optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  assignedStaffId: z.string().uuid().nullable().optional(),
});

const rejectBoatSchema = z.object({
  reason: z.string().max(4000).optional(),
  macroCode: z.string().max(80).optional(),
});

const moderationActionSchema = z.object({
  actionType: z.enum(["WARNING", "TEMP_SUSPENSION", "INDEFINITE_SUSPENSION", "PERMANENT_BAN"]),
  reason: z.string().min(3).max(2000),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * @param {import('express').Express} app
 * @param {{ loginLimiter?: import('express').RequestHandler }} opts
 */
export function installAdminRoutes(app, opts = {}) {
  const loginLimiter = opts.loginLimiter;

  // —— Consumer ticket routes (Fase 1) ——
  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const body = createTicketSchema.parse(req.body ?? {});
      const ticket = await createTicket({
        userId: req.user.sub,
        type: body.type,
        subject: body.subject,
        body: body.body,
        priority: body.priority,
        relatedBookingId: body.relatedBookingId,
        relatedBoatId: body.relatedBoatId,
      });
      return res.status(201).json({ ticket });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      const msg = e instanceof Error ? e.message : "Erro ao criar ticket.";
      return res.status(500).json({ error: msg });
    }
  });

  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const tickets = await listTickets({ userId: req.user.sub, limit: 50 });
      return res.json({ tickets });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao listar tickets.";
      return res.status(500).json({ error: msg });
    }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ok = await userCanAccessTicket(req.user.sub, req.params.id);
      if (!ok) return res.status(404).json({ error: "Ticket não encontrado." });
      const ticket = await getTicketById(req.params.id);
      const messages = await listTicketMessages(req.params.id);
      return res.json({ ticket, messages });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar ticket.";
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const ok = await userCanAccessTicket(req.user.sub, req.params.id);
      if (!ok) return res.status(404).json({ error: "Ticket não encontrado." });
      const body = ticketMessageSchema.parse(req.body ?? {});
      const messages = await addTicketMessage(req.params.id, {
        userId: req.user.sub,
        body: body.body,
      });
      await updateTicket(req.params.id, { status: "WAITING_STAFF" });
      return res.json({ messages });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      const msg = e instanceof Error ? e.message : "Erro ao enviar mensagem.";
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/chat/reports", requireAuth, async (req, res) => {
    try {
      const body = z
        .object({
          bookingId: z.string().uuid(),
          messageId: z.string().uuid().optional().nullable(),
          reason: z.string().min(3).max(500),
        })
        .parse(req.body ?? {});
      const id = await createChatReport({
        reporterUserId: req.user.sub,
        bookingId: body.bookingId,
        messageId: body.messageId,
        reason: body.reason,
      });
      return res.status(201).json({ id });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      const msg = e instanceof Error ? e.message : "Erro ao denunciar.";
      return res.status(500).json({ error: msg });
    }
  });

  app.post("/api/moderation/reports", requireAuth, async (req, res) => {
    try {
      const body = z
        .object({
          targetUserId: z.string().uuid().optional().nullable(),
          targetBoatId: z.string().uuid().optional().nullable(),
          reason: z.string().min(3).max(500),
        })
        .parse(req.body ?? {});
      const id = await createModerationCase({
        reporterUserId: req.user.sub,
        targetUserId: body.targetUserId,
        targetBoatId: body.targetBoatId,
        reason: body.reason,
      });
      return res.status(201).json({ id });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      const msg = e instanceof Error ? e.message : "Erro ao denunciar.";
      return res.status(500).json({ error: msg });
    }
  });

  // —— Staff auth ——
  app.post("/api/admin/auth/login", loginLimiter ?? ((_, __, next) => next()), async (req, res) => {
    try {
      const body = staffLoginSchema.parse(req.body ?? {});
      const staff = await authenticateStaff(body.email, body.password);
      if (!staff) return res.status(401).json({ error: "Credenciais inválidas." });
      const token = signStaffToken(staff);
      await writeAuditLog({
        actorStaffId: staff.id,
        action: "staff.login",
        entityType: "staff_user",
        entityId: staff.id,
      });
      return res.json({
        token,
        staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role },
      });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      return res.status(500).json({ error: "Erro no login." });
    }
  });

  app.get("/api/admin/me", requireStaffAuth, async (req, res) => {
    const r = await query(
      `select id, name, email, role, active from staff_users where id = $1::uuid limit 1`,
      [req.staff.sub]
    );
    const row = r.rows[0];
    if (!row || !row.active) return res.status(401).json({ error: "Conta inactiva." });
    return res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      permissions: Object.fromEntries(
        Object.entries({
          ticketsView: staffCan(row.role, "ticketsView"),
          ticketsManage: staffCan(row.role, "ticketsManage"),
          boatsReview: staffCan(row.role, "boatsReview"),
          moderationBasic: staffCan(row.role, "moderationBasic"),
          moderationBan: staffCan(row.role, "moderationBan"),
          auditView: staffCan(row.role, "auditView"),
          staffManage: staffCan(row.role, "staffManage"),
          dashboardView: staffCan(row.role, "dashboardView"),
          macrosManage: staffCan(row.role, "macrosManage"),
          tagsManage: staffCan(row.role, "tagsManage"),
        })
      ),
    });
  });

  // —— Dashboard (Fase 2) ——
  app.get("/api/admin/dashboard", requireStaffAuth, requireStaffPermission("dashboardView"), async (_req, res) => {
    try {
      const metrics = await getDashboardMetrics();
      return res.json(metrics);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar métricas.";
      return res.status(500).json({ error: msg });
    }
  });

  // —— Tickets ——
  app.get("/api/admin/tickets", requireStaffAuth, requireStaffPermission("ticketsView"), async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const tickets = await listTickets({ status, limit: 100 });
      return res.json({ tickets });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar tickets." });
    }
  });

  app.get("/api/admin/tickets/:id", requireStaffAuth, requireStaffPermission("ticketsView"), async (req, res) => {
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket não encontrado." });
      const messages = await listTicketMessages(req.params.id);
      return res.json({ ticket, messages });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao consultar ticket." });
    }
  });

  app.patch("/api/admin/tickets/:id", requireStaffAuth, requireStaffPermission("ticketsManage"), async (req, res) => {
    try {
      const body = updateTicketSchema.parse(req.body ?? {});
      const ticket = await updateTicket(req.params.id, body);
      await writeAuditLog({
        actorStaffId: req.staff.sub,
        action: "ticket.update",
        entityType: "ticket",
        entityId: req.params.id,
        metadata: body,
      });
      return res.json({ ticket });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      return res.status(500).json({ error: "Erro ao actualizar ticket." });
    }
  });

  app.post("/api/admin/tickets/:id/messages", requireStaffAuth, requireStaffPermission("ticketsManage"), async (req, res) => {
    try {
      const body = ticketMessageSchema.parse(req.body ?? {});
      const messages = await addTicketMessage(req.params.id, {
        staffId: req.staff.sub,
        body: body.body,
      });
      await updateTicket(req.params.id, { status: "WAITING_CUSTOMER" });
      await writeAuditLog({
        actorStaffId: req.staff.sub,
        action: "ticket.reply",
        entityType: "ticket",
        entityId: req.params.id,
      });
      return res.json({ messages });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      return res.status(500).json({ error: "Erro ao responder ticket." });
    }
  });

  // —— Tags (Fase 2) ——
  app.get("/api/admin/tags", requireStaffAuth, requireStaffPermission("tagsManage"), async (_req, res) => {
    try {
      return res.json({ tags: await listTags() });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar tags." });
    }
  });

  app.post("/api/admin/tags", requireStaffAuth, requireStaffPermission("tagsManage"), async (req, res) => {
    try {
      const body = z.object({ name: z.string().min(1).max(40), color: z.string().max(20).optional() }).parse(req.body ?? {});
      const tag = await createTag(body);
      return res.status(201).json({ tag });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      return res.status(500).json({ error: "Erro ao criar tag." });
    }
  });

  app.post("/api/admin/tickets/:id/tags/:tagId", requireStaffAuth, requireStaffPermission("tagsManage"), async (req, res) => {
    try {
      await addTagToTicket(req.params.id, req.params.tagId);
      const ticket = await getTicketById(req.params.id);
      return res.json({ ticket });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao adicionar tag." });
    }
  });

  app.delete("/api/admin/tickets/:id/tags/:tagId", requireStaffAuth, requireStaffPermission("tagsManage"), async (req, res) => {
    try {
      await removeTagFromTicket(req.params.id, req.params.tagId);
      const ticket = await getTicketById(req.params.id);
      return res.json({ ticket });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao remover tag." });
    }
  });

  // —— Boat approval ——
  app.get("/api/admin/boats/review-queue", requireStaffAuth, requireStaffPermission("boatsReview"), async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : "PENDING_REVIEW";
      const boats = await listBoatReviewQueue({ status });
      return res.json({ boats });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar fila." });
    }
  });

  app.get("/api/admin/boats/:id/review", requireStaffAuth, requireStaffPermission("boatsReview"), async (req, res) => {
    try {
      const boat = await getBoatReviewDetail(req.params.id);
      if (!boat) return res.status(404).json({ error: "Embarcação não encontrada." });
      return res.json({ boat });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao consultar embarcação." });
    }
  });

  app.post("/api/admin/boats/:id/under-review", requireStaffAuth, requireStaffPermission("boatsReview"), async (req, res) => {
    try {
      const boat = await markBoatUnderReview(req.params.id, req.staff.sub);
      if (!boat) return res.status(404).json({ error: "Embarcação não encontrada." });
      return res.json({ boat });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao marcar em análise." });
    }
  });

  app.post("/api/admin/boats/:id/approve", requireStaffAuth, requireStaffPermission("boatsReview"), async (req, res) => {
    try {
      const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
      const boat = await approveBoat(req.params.id, { staffId: req.staff.sub, notes });
      if (!boat) return res.status(404).json({ error: "Embarcação não encontrada." });
      return res.json({ boat });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao aprovar." });
    }
  });

  app.post("/api/admin/boats/:id/reject", requireStaffAuth, requireStaffPermission("boatsReview"), async (req, res) => {
    try {
      const body = rejectBoatSchema.parse(req.body ?? {});
      const boat = await rejectBoat(req.params.id, {
        staffId: req.staff.sub,
        reason: body.reason ?? "",
        macroCode: body.macroCode,
      });
      if (!boat) return res.status(404).json({ error: "Embarcação não encontrada." });
      return res.json({ boat });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao recusar.";
      return res.status(400).json({ error: msg });
    }
  });

  app.post("/api/admin/boats/:id/suspend", requireStaffAuth, requireStaffPermission("boatsReview"), async (req, res) => {
    try {
      const reason = z.string().min(3).max(2000).parse(req.body?.reason ?? "");
      const boat = await suspendBoat(req.params.id, { staffId: req.staff.sub, reason });
      return res.json({ boat });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao suspender.";
      return res.status(400).json({ error: msg });
    }
  });

  // —— Macros (Fase 2) ——
  app.get("/api/admin/macros", requireStaffAuth, async (req, res) => {
    try {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const macros = await listMacros({ category });
      return res.json({ macros });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar macros." });
    }
  });

  app.post("/api/admin/macros", requireStaffAuth, requireStaffPermission("macrosManage"), async (req, res) => {
    try {
      const body = z
        .object({
          code: z.string().min(2).max(80),
          category: z.string().min(2).max(80),
          title: z.string().min(2).max(120),
          body: z.string().min(3).max(4000),
        })
        .parse(req.body ?? {});
      const macro = await createMacro(body);
      return res.status(201).json({ macro });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      return res.status(500).json({ error: "Erro ao criar macro." });
    }
  });

  app.patch("/api/admin/macros/:id", requireStaffAuth, requireStaffPermission("macrosManage"), async (req, res) => {
    try {
      const body = z
        .object({
          title: z.string().min(2).max(120).optional(),
          body: z.string().min(3).max(4000).optional(),
          active: z.boolean().optional(),
        })
        .parse(req.body ?? {});
      const macro = await updateMacro(req.params.id, body);
      if (!macro) return res.status(404).json({ error: "Macro não encontrada." });
      return res.json({ macro });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      return res.status(500).json({ error: "Erro ao actualizar macro." });
    }
  });

  // —— Moderation (Fase 2) ——
  app.get("/api/admin/moderation/cases", requireStaffAuth, requireStaffPermission("moderationBasic"), async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const cases = await listModerationCases({ status });
      return res.json({ cases });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar casos." });
    }
  });

  app.post("/api/admin/moderation/cases/:id/actions", requireStaffAuth, requireStaffPermission("moderationBasic"), async (req, res) => {
    try {
      const body = moderationActionSchema.parse(req.body ?? {});
      const result = await applyModerationAction(req.params.id, {
        staffId: req.staff.sub,
        staffRole: req.staff.staff_role,
        actionType: body.actionType,
        reason: body.reason,
        expiresAt: body.expiresAt,
      });
      if (!result) return res.status(404).json({ error: "Caso não encontrado." });
      return res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao aplicar sanção.";
      return res.status(400).json({ error: msg });
    }
  });

  app.get("/api/admin/chat/reports", requireStaffAuth, requireStaffPermission("moderationBasic"), async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const reports = await listChatReports({ status });
      return res.json({ reports });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar denúncias." });
    }
  });

  app.patch("/api/admin/chat/reports/:id", requireStaffAuth, requireStaffPermission("moderationBasic"), async (req, res) => {
    try {
      const body = z.object({ status: z.string(), note: z.string().max(2000).optional() }).parse(req.body ?? {});
      await resolveChatReport(req.params.id, {
        staffId: req.staff.sub,
        status: body.status,
        note: body.note,
      });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao actualizar denúncia." });
    }
  });

  app.get("/api/admin/chat/bookings/:bookingId/messages", requireStaffAuth, requireStaffPermission("moderationBasic"), async (req, res) => {
    try {
      const messages = await listBookingMessagesForStaff(req.params.bookingId);
      return res.json({ messages });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar mensagens." });
    }
  });

  app.get("/api/admin/chat/search", requireStaffAuth, requireStaffPermission("moderationBasic"), async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      if (!q.trim()) return res.json({ messages: [] });
      const messages = await searchChatMessages(q);
      return res.json({ messages });
    } catch (e) {
      return res.status(500).json({ error: "Erro na pesquisa." });
    }
  });

  // —— Audit ——
  app.get("/api/admin/audit", requireStaffAuth, requireStaffPermission("auditView"), async (req, res) => {
    try {
      const logs = await listAuditLogs({
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
        entityType: typeof req.query.entityType === "string" ? req.query.entityType : undefined,
      });
      return res.json({ logs });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar auditoria." });
    }
  });

  // —— Staff management (ADMIN) ——
  app.get("/api/admin/staff", requireStaffAuth, requireStaffPermission("staffManage"), async (_req, res) => {
    try {
      const r = await query(
        `select id, name, email, role, active, created_at from staff_users order by created_at asc`
      );
      return res.json({ staff: r.rows });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar staff." });
    }
  });

  app.post("/api/admin/staff", requireStaffAuth, requireStaffPermission("staffManage"), async (req, res) => {
    try {
      const body = z
        .object({
          name: z.string().min(2).max(120),
          email: z.string().email(),
          password: z.string().min(8),
          role: z.enum(["STAFF", "MODERATOR", "SENIOR_MODERATOR", "ADMIN"]),
        })
        .parse(req.body ?? {});
      const hash = await bcrypt.hash(body.password, 10);
      const r = await query(
        `insert into staff_users (name, email, password_hash, role)
         values ($1, $2, $3, $4::staff_role)
         returning id, name, email, role, active, created_at`,
        [body.name, body.email, hash, body.role]
      );
      await writeAuditLog({
        actorStaffId: req.staff.sub,
        action: "staff.create",
        entityType: "staff_user",
        entityId: r.rows[0].id,
        metadata: { email: body.email, role: body.role },
      });
      return res.status(201).json({ staff: r.rows[0] });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      const msg = e && typeof e === "object" && "code" in e && e.code === "23505" ? "E-mail já registado." : "Erro ao criar staff.";
      return res.status(400).json({ error: msg });
    }
  });
}

export async function bootstrapAdminData() {
  await ensureDefaultMacros();
}
