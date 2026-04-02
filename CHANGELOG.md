# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste ficheiro.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/) a partir da **v0.10.0**.

As versões **v0.1.0–v0.9.0** foram documentadas **retroactivamente** com base no histórico Git (`git log`).

---

## [0.10.1] — 2026-04-02

### Alterado

- Legenda do calendário: texto **«Indisponível»** (pt), **«Unavailable»** (en), **«No disponible»** (es) em substituição de «Bloqueio (armador)» / equivalentes.
- **Minha conta**: o botão voltar passa a ir sempre para **`/explorar`** (em vez do histórico do browser).

---

## [0.10.0] — 2026-04-01

### Adicionado

- Coluna **`booking_date`** nas reservas; calendário por barco.
- Tabelas **`boat_date_locks`** e **`boat_weekday_locks`** (travas por dia específico ou por dia da semana).
- **`GET /api/boats/:id/calendar`** e **`PUT /api/owner/boats/:id/calendar-locks`**.
- Regras de negócio: pedido **pendente** não bloqueia o dia; **aceite/concluído** bloqueia; aceitar reserva valida conflito no mesmo dia.
- UI: **`BoatCalendarPanel`** (picker, só leitura, edição de travas); **Reservar** com data obrigatória; **Conta → Reservas** com calendário, alteração de data e de passageiros (limite pela capacidade); **Marinheiro** com calendário na edição do barco e painel por embarcação.
- Traduções **pt / en / es** para calendário e textos associados.

### Alterado

- **`POST /api/bookings`** e **`PATCH /api/renter/bookings`** passam a suportar data e validações de capacidade/disponibilidade.

---

## [0.9.0] — 2026-04-01

### Adicionado

- **Amenities** por barco (catálogo global + inclusão por embarcação); filtro no **Explorar** por “incluso”.
- **Roteiro** na reserva (paradas, revisão); **`route_islands`** nas reservas.
- Página **Conta → Reservas** (banhista): estados, edição, repasse a pendente para o locatário.
- **Marinheiro**: editor de inclusões, fotos opcionais por parada do roteiro + termos, conclusão de passeio, listagens alargadas.
- Estado **`COMPLETED`** em reservas; colunas/schema para roteiro e imagens por parada (`route_island_images`, etc.).

---

## [0.8.0] — 2026-04-01

### Adicionado

- Sugestões de **praias** no Explorar; rotas de barco **sem mapa** (listagem).
- Maior **resiliência** na API e carregamento de catálogo.

---

## [0.7.0] — 2026-04-01

### Adicionado

- Mensagens de erro quando a API falha ao carregar barcos em produção.
- **Proxy Vercel** para API (Railway), rewrites SPA que **não** engolem `/api`; uso de **`VITE_API_BASE_URL`** e CORS (incl. `*.vercel.app`).
- Normalização de URL da API (ex.: prefixo `https://`).

### Corrigido

- **BoatCard** sem `NaN` quando não há imagens; favoritos com revert e IDs seguros.
- **Favoritos** na página de detalhe do barco; proxy e erros 503.

### Alterado

- Documentação de deploy Vercel (build, NOT_FOUND, etc.).

---

## [0.6.0] — 2026-03-19

### Alterado

- Melhorias de **UX** no formulário de barco do locatário e tratamento de **roteiros**.

---

## [0.5.0] — 2026-03-19

### Removido

- **Setas** do mapa de roteiros sugeridos quando passavam sobre terra.
- **Polylines** no mapa de roteiros sugeridos (mapa simplificado).

### Alterado

- Tiles do mapa para **imagem de satélite**.

---

## [0.4.0] — 2026-03-19

### Adicionado

- Metadados Alto Mar e imagem de **preview social**.
- **Gestão de barcos** do locatário no painel.
- **Página de conta** e **favoritos persistentes** (API dedicada).
- Melhorias na conta (secção de rotas, destino ao **logout**); carregamento de favoritos pela API.

### Documentação

- Ajustes e troubleshooting de **CORS** e **502** (Railway).

---

## [0.3.0] — 2026-03-19

### Adicionado

- **API Node + PostgreSQL**: utilizadores, barcos, imagens, reservas, integração **Mercado Pago**, favoritos.
- **Autenticação** (login/registo) e papéis **banhista** / **locatário**.
- Documentação de **deploy**; script de **túnel**; integração **Capacitor** / Android no repositório.

---

## [0.2.0] — 2026-03-19

### Adicionado

- Ecrã **Marinheiro** (evolução posterior para painel completo).
- Fluxo de **reserva**: páginas, navegação e botão de reserva.

---

## [0.1.0] — 2026-03-19

### Adicionado

- Projecto base **Vite + React + shadcn/ui**.
- Branding **Alto Mar**, páginas iniciais e assets; correcções de tela branca e log de arranque.

---

## Legenda

- **Adicionado** — funcionalidades novas.
- **Alterado** — comportamento ou UX alterado.
- **Corrigido** — bugs.
- **Removido** — funcionalidades retiradas ou substituídas.

---

## Tags Git e releases

- A tag **`v0.10.1`** marca o estado actual do código alinhado a este changelog.
- Versões **0.1.0–0.9.0** são documentais (histórico retroactivo); pode criar tags adicionais nos commits antigos se precisar de comparações no GitHub.
