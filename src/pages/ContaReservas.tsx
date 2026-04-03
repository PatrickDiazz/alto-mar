import { Navigate } from "react-router-dom";

/** Rota legada: reservas do banhista passaram a ficar em /conta. */
const ContaReservas = () => <Navigate to="/conta#conta-reservas" replace />;

export default ContaReservas;
