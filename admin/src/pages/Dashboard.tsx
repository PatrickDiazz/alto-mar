import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminJson } from "../lib/auth";

type Metrics = {
  support: {
    openTickets: number;
    resolvedLast30Days: number;
    avgResolutionHours: number;
    avgFirstResponseMinutes: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  };
  approval: {
    pending: number;
    approvedLast30Days: number;
    rejectedLast30Days: number;
    avgReviewHours: number;
  };
  moderation: {
    openCases: number;
    openChatReports: number;
    activeSuspensions: number;
  };
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminJson<Metrics>("/api/admin/dashboard")
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!metrics) return <p>A carregar métricas…</p>;

  return (
    <div>
      <h1 className="page-title">Dashboard operacional</h1>

      <h2 style={{ fontSize: "1rem", color: "var(--muted)" }}>Suporte</h2>
      <div className="metrics">
        <div className="metric">
          <div className="metric-value">{metrics.support.openTickets}</div>
          <div className="metric-label">Tickets abertos</div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.support.resolvedLast30Days}</div>
          <div className="metric-label">Resolvidos (30d)</div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.support.avgResolutionHours}h</div>
          <div className="metric-label">SLA médio resolução</div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.support.avgFirstResponseMinutes}m</div>
          <div className="metric-label">1ª resposta média</div>
        </div>
      </div>

      <h2 style={{ fontSize: "1rem", color: "var(--muted)" }}>Aprovação</h2>
      <div className="metrics">
        <div className="metric">
          <div className="metric-value">{metrics.approval.pending}</div>
          <div className="metric-label">
            <Link to="/boats">Pendentes</Link>
          </div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.approval.approvedLast30Days}</div>
          <div className="metric-label">Aprovadas (30d)</div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.approval.rejectedLast30Days}</div>
          <div className="metric-label">Recusadas (30d)</div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.approval.avgReviewHours}h</div>
          <div className="metric-label">Tempo médio análise</div>
        </div>
      </div>

      <h2 style={{ fontSize: "1rem", color: "var(--muted)" }}>Moderação</h2>
      <div className="metrics">
        <div className="metric">
          <div className="metric-value">{metrics.moderation.openCases}</div>
          <div className="metric-label">
            <Link to="/moderation">Casos abertos</Link>
          </div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.moderation.openChatReports}</div>
          <div className="metric-label">
            <Link to="/chat-reports">Denúncias chat</Link>
          </div>
        </div>
        <div className="metric">
          <div className="metric-value">{metrics.moderation.activeSuspensions}</div>
          <div className="metric-label">Suspensões activas</div>
        </div>
      </div>
    </div>
  );
}
