/** Estado opcional em `location.state` ao navegar para `/login`. */
export type LoginLocationState = {
  from?: string;
  /** Contexto da bottom bar (mobile) — mensagem extra no login. */
  loginContext?: "reservations" | "favorites" | "signIn";
};
