import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getStaff } from "../lib/auth";

export default function Layout() {
  const staff = getStaff();
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Alto Mar · Ops</div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/tickets">Tickets</NavLink>
          <NavLink to="/boats">Embarcações</NavLink>
          <NavLink to="/marinheiros">Tripulação</NavLink>
          <NavLink to="/moderation">Moderação</NavLink>
          <NavLink to="/chats">Chats</NavLink>
          <NavLink to="/macros">Macros</NavLink>
          <NavLink to="/tags">Tags</NavLink>
          {staff?.permissions?.usersManage && (
            <NavLink to="/users">Contas</NavLink>
          )}
          {staff?.permissions?.auditView && (
            <NavLink to="/audit">Auditoria</NavLink>
          )}
          {staff?.permissions?.staffManage && (
            <NavLink to="/staff">Equipe</NavLink>
          )}
        </nav>
        <div style={{ padding: "1rem 1.25rem", marginTop: "auto", fontSize: "0.8rem", color: "var(--muted)" }}>
          <div>{staff?.name}</div>
          <div>{staff?.role}</div>
          <button type="button" className="btn btn-sm" style={{ marginTop: "0.5rem" }} onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
