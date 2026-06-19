# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste ficheiro.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/) a partir da **v0.10.0**.

As versões **v0.1.0–v0.9.0** foram documentadas **retroactivamente** com base no histórico Git (`git log`).

---

## [Unreleased]

---

## [0.14.6] — 2026-06-18

### Adicionado

- **Favicon do site**: ícones PNG gerados a partir da logo Alto Mar (`favicon-32`, `favicon-192`, `apple-touch-icon`).
- **`server/appUrl.js`**: normaliza `FRONTEND_URL` / `API_PUBLIC_URL` sem esquema (`altomar.app` → `https://altomar.app`).

### Alterado

- **Frota demo**: os 30 barcos fictícios passam a ser criados sempre **verificados** (selo visível no Explorar).

### Corrigido

- **Stripe / OAuth / MP**: URLs de retorno deixam de falhar com «Invalid URL: An explicit scheme must be provided» quando `FRONTEND_URL` no Railway vem sem `https://`.

### Versões

- Cliente e servidor **0.14.6**; Android **`versionName` 0.14.6**, **`versionCode` 18**; console admin **0.1.1** (inalterado).

---

## [0.14.5] — 2026-06-17

### Alterado

- **Domínio de produção** `altomar.app`: CORS aceita `altomar.app` e `*.altomar.app`; retornos do Stripe Checkout validam o mesmo domínio; guia de deploy actualizado.

### Versões

- Cliente e servidor **0.14.5**; Android **`versionName` 0.14.5**, **`versionCode` 17**; console admin **0.1.1** (inalterado).

---

## [0.14.4] — 2026-06-14

### Adicionado

- **Auditoria (admin)**: listagem por conta operacional staff (`/audit`) e página de acções por conta (`/audit/:accountId`); APIs `GET /api/admin/audit/accounts` e `GET /api/admin/audit/accounts/:accountId`.
- **Admin em produção**: suporte a `VITE_API_BASE_URL` (chamada directa à Railway), proxy serverless `admin/api/[...path].js` e `admin/vercel.json`; mensagens de erro de API mais claras.

### Alterado

- **Tokens staff**: segredo opcional `JWT_SECRET_STAFF` em `server/.env` / Railway (fallback para `JWT_SECRET`); documentação em `admin/README.md` e `server/.env.example`.

### Corrigido

- **Chats (admin)**: erro SQL «column reference "id" is ambiguous» ao abrir conversa com denúncias.
- **Build Vercel (admin)**: PostCSS deixava de herdar Tailwind da raiz do monorepo (`admin/postcss.config.js`, `vite.config.ts`).

### Versões

- Cliente e servidor **0.14.4**; Android **`versionName` 0.14.4**, **`versionCode` 16**; console admin **0.1.1** (projeto independente em `admin/`).

---

## [0.14.3] — 2026-06-14

### Adicionado

- **Login social** (Google e Facebook): fluxo OAuth no servidor (`server/oauth/`), callback `/auth/callback`, botões em Login e Signup; variáveis `GOOGLE_*`, `FACEBOOK_*` e migração `db/oauth_providers.sql`.
- **Reserva — roteiro**: banhista escolhe entre roteiros sugeridos pelo locador (`BookingRoutePicker`); paradas enviadas na reserva; alinhamento com `getRoutesForBoat` da ficha do barco.
- **Motion / UX**: skeletons com shimmer (Explorar, DetalhesBarco, carregar mais); entrada em cascata nos cards; scroll reveal nas secções da Explorar; transições suaves entre rotas; micro-interações em botões, favoritos e Home.
- **Console operacional — fase inicial** (`admin/`, porta **5174**): RBAC staff, tickets, fila de aprovação de embarcações, moderação, denúncias e conversas de chat, auditoria, dashboard, macros, tags e gestão de staff; API em `server/admin/` (`/api/admin/*`); seed `npm --prefix server run seed:staff`; guia em **`admin/README.md`**.

### Alterado

- **Detalhes do barco**: calendário de disponibilidade em modo só leitura (sem seleção de dias; navegação entre meses mantida).
- **Roteiros no anúncio**: cada linha em `route_islands` passa a representar um roteiro alternativo (paradas separadas por vírgula na mesma linha).
- **Listagens públicas**: apenas embarcações **verificadas**; locador deixa de auto-aprovar embarcação no registo.

### Notas

- O **sistema de suporte / operações** (console admin) está em **fase inicial**: adequado para uso interno e iteração; em produção exige deploy separado (ex. Vercel em `admin/`), `EXTRA_CORS_ORIGINS` na API e credenciais staff fora dos defaults de seed.

### Versões

- Cliente e servidor **0.14.3**; Android **`versionName` 0.14.3**, **`versionCode` 15**; console admin **0.1.0** (projeto independente em `admin/`).

---

## [0.14.2] — 2026-06-07

### Adicionado

- **Chat por reserva** (banhista ↔ locador): módulo `server/chat/` (`booking_messages`, REST, filtro anti-contacto/link, rate limit); notificação **`BOOKING_MESSAGE`** + push FCM por mensagem; disponível **apenas** com reserva **`ACCEPTED`**.
- **UI do chat**: **mobile** — página dedicada (`/conta/reservas/:id/chat`, `/marinheiro/reservas/:id/chat`) com voltar à reserva; **desktop** — popup (`BookingChatDialog`) na ficha da reserva.
- **Documentação**: `docs/CHAT-ARCHITECTURE.md`, PDF e secção 17 em **`docs/BUSINESS-RULES.md`**; migração `db/booking_messages.sql`.
- **Painel locador**: badges de countdown coloridos (`BookingCountdownBadge`), distinção em curso / confirmada / atrasada; menu mobile (☰) com navegação da sidebar; **`ownerBookingTiming.ts`**.
- **Seed demo Stripe**: `npm run db:seed-stripe-bookings` (reservas futuras com checkout e comprovante de teste).
- **i18n** (pt / en / es): `bookingChat.*`, `ownerBooking.*`.

### Alterado

- **Explorar (mobile)**: carrossel com bloqueio de eixo (scroll horizontal ou vertical da página, não ambos); sem loop circular entre primeiro e último barco.
- **Notificações**: leitura ao visitar rotas de chat; deep links para página/popup de mensagens.
- **`docs/BUSINESS-RULES.md`**: regras de disponibilidade, notificações e chat consolidadas.

### Corrigido

- **Pagamentos Stripe no app Android**: CORS aceita origem `https://localhost` (Capacitor); Checkout em Custom Tab (`@capacitor/browser`); retorno pós-pagamento com `returnBaseUrl` nativo e sync da sessão.
- **Notificações**: badge em «Reservas» reflecte avisos não lidos; avisos marcados como lidos ao abrir Reservas ou ficha; itens já vistos mais apagados no sino.
- **Disponibilidade / painel locador**: `PENDING` paga não bloqueia a diária; locador só vê reserva após pagamento aprovado; SQL de ocupação e opcionais alinhados ao enum `booking_status`.
- **Stripe seed / checkout**: correcções em `bookingAvailability.js`, `ownerOptionals.js` e `applyCheckoutPaid.js` que impediam criar reservas de demonstração.

### Versões

- Cliente e servidor **0.14.2**; Android **`versionName` 0.14.2**, **`versionCode` 14**.

---

## [0.14.1] — 2026-06-06

### Adicionado

- **App Android (Capacitor)**: shell híbrido `com.altomar.app`, plugins App / Geolocation / Push, permissões no manifest, scripts `cap:sync`, `android:build`, `android:live*` e guia **`docs/ANDROID.md`** (build, API em dispositivo, FCM, live reload).
- **Notificações**: módulo `server/notifications/` (schema, FCM opcional, eventos de reserva); APIs `GET/POST /api/notifications*`; **`NotificationBell`**, **`NotificationsContext`** (polling + push token); disparos nos fluxos de reserva, cancelamento, reagendamento e webhooks Stripe.
- **Stripe / PIX (backend)**: suporte a PIX no Checkout quando `STRIPE_PIX_ENABLED=1`; capability **`pix_payments`** em Connect; activação via PMC (`ensureStripePixPmc.js`, `npm run stripe:enable-pix-pmc`); flag **`STRIPE_SKIP_PIX_PMC`**.
- **Stripe / reembolsos e Connect**: `refunds.js`, `cancellationPolicy.js`, `transferWorker.js`, webhooks (refund, dispute, transfer), cron de repasses, cancelamento pelo locador, métricas Connect, banner de onboarding na UI.
- **Painel locador**: sidebar desktop (**Agenda** antes de **Reservas**), ficha de reserva dedicada (`/marinheiro/reservas/:id`), agenda com navegação directa para a ficha, secção «Barcos sem reservas» colapsável.
- **Documentação**: `docs/ONBOARDING.md`, `ENGINEERING-RUNBOOK.md`, `BACKEND-API-CONTRACT.md`, `BUSINESS-RULES.md`, `SECURITY-SECRETS.md`, `TEST-PLAYBOOK.md`; README e **`STRIPE-INTEGRATION-DESIGN.md`** actualizados.
- **i18n** (pt / en / es): `notifications.*`, avisos ao locatário, política de cancelamento, PIX indisponível, **`APPROVED` → «Aprovado»** no painel de reservas.

### Alterado

- **Reservar**: redireccionamento imediato ao Stripe Checkout quando `paymentsProvider=stripe`; PIX na UI temporariamente indisponível.
- **RenterBookingsPanel**: pagamento Stripe em **PENDING**; cancelamento de **ACCEPTED** com formulário inline; avisos via **`renterNoticeCode`**.
- **Marinheiro**: aceite bloqueado até pagamento **APPROVED** (Stripe); conclusão e avaliação com refresh optimista na ficha.
- **`server/stripe/checkout.js`**: `customer_email`, idempotency incrementada, sessão para **PENDING** e **ACCEPTED**.
- **Android / safe area**: `viewport-fit=cover`, insets nativos e padding nos headers (Explorar, Home, painel locador) para entalhe da câmara frontal.

### Corrigido

- **PostgreSQL**: `POST /api/renter/bookings/:id/cancel` com **`FOR UPDATE OF bk`** (evita erro em `LEFT JOIN`).
- **Android**: crash ao abrir sessão sem Firebase — push nativo só com **`VITE_NATIVE_PUSH=1`** e `google-services.json`; URL de live reload não fica presa no APK após `cap sync` normal.

### Versões

- Cliente e servidor **0.14.1**; Android **`versionName` 0.14.1**, **`versionCode` 13**.

---

## [0.14.0] — 2026-05-28

### Adicionado

- **Painel Marinheiro** reestruturado em rotas dedicadas (`OwnerPanelLayout`, navegação inferior no mobile): **Início**, **Agenda**, **Reservas**, **Embarcações**, **Opcionais**, **Perfil** e **Faturamento**.
- **Início do locador** (`GET /api/owner/dashboard`): passeios e faturamento do mês, prévia da agenda, top embarcações e atalhos para opcionais.
- **Cadastro de embarcação em etapas** (`/marinheiro/embarcacoes/novo`): wizard com pré-visualização do anúncio, validação por passo, confirmação com declarações e link ao **Contrato de Parceria** (PDF em `public/documents/`); ecrã **em análise** após envio (`verified: false`).
- Etapas do wizard: dados básicos, fotos, roteiro (paradas + embarque), fotos do roteiro (opcional com **Pular**), opcionais (amenidades, kit churrasco, jet ski, extras), mídia (vídeo, TIE, TIEM) e confirmação.
- **Moto aquática**: fluxo reduzido de etapas; **capacidade fixa em 2 pessoas** (UI e validação na API).
- **Faturamento** (`/marinheiro/faturamento`): dashboard de receita com filtro de período, gráficos, desempenho, **receita por origem** (embarcações vs opcionais), repasses e transações Stripe (`ownerRevenueDashboard.js`, APIs `revenue/dashboard`, `monthly`, `daily`).
- **Opcionais globais do locador**: CRUD em `/marinheiro/opcionais` e APIs `GET/POST/PATCH/DELETE /api/owner/optionals`; migração `db/owner_optionals.sql`.
- **Preço do kit churrasco** configurável pelo locador (mín. R$ 1,00 quando o kit está activo).
- **Avaliações ao banhista**: média e listagem combinam avaliações **reais** e **mock** estáveis por barco (`server/boatDisplayRating.js`); testes em `src/lib/boatDisplayRating.test.ts`.
- Módulos de apoio: `ownerDashboard.js`, `ownerRevenue.js`, `ownerOptionals.js`, `ownerStripeTransactions.js`, libs `ownerBoatRegister*`, `ownerPartnershipContract.ts`.

### Alterado

- **`Marinheiro.tsx`**: de página monolítica para router com lazy-loading das páginas em `src/pages/owner/`.
- **Detalhes / reviews**: estrela e média alinhadas à API de reviews (`BoatConsumerReviews` usa `average` combinado).
- **Listagens públicas de barcos**: `nota` exibida com média real + mock; painel do locador mantém `rating` só de reservas reais.
- Confirmação final do cadastro: declarações sem citação de cláusulas numeradas na UI (contrato só via PDF).
- **i18n** (pt / en / es): `ownerPanel.*`, `marinheiro.register*`, faturamento, moto aquática, confirmação e bloqueios de etapa.

### Corrigido

- **`POST /api/owner/boats`**: `require is not defined` ao normalizar opcionais customizados (ESM: `crypto.randomUUID()`).
- Reinício da API após refactor de avaliações (import único de `buildDemoBoatReviews` em `boatDisplayRating.js`).

### Versões

- Cliente e servidor **0.14.0**; Android **`versionName` 0.14.0**, **`versionCode` 12**.

---

## [0.13.3] — 2026-05-16

### Adicionado

- **Opcionais do passeio**: secção unificada em **Detalhes**, **Reservar** e cartões (`BoatOptionalsSection`, `TripOptionalCard`, `BbqKitOptionalCard`) para kit churrasco, moto aquática e extras do locador.
- **Kit churrasco**: expansão **Ver composição do kit** com tabela animada; gatilho com destaque em flash na borda inferior; variantes na reserva (kit completo / só bebidas não alcoólicas).
- **Explorar**: filtro por opcionais (churrasco, moto, tapete flutuante, extras); faixa de opcionais no **BoatCard** em letreiro horizontal; componente **`FilterChipScrollMat`** (scroll com gradiente no rodapé).
- **Detalhes do barco**: carrossel de fotos com **slide** horizontal; bloco de **avaliações de consumidores** expansível (`GET /api/boats/:id/reviews`, demo quando vazio).
- **Marinheiro (locador)**: ao marcar **Kit churrasco**, tabela para definir itens, quantidades e unidade (**un** / **kg** / **L**), persistida em **`boats.bbq_kit_items`**.
- **API / demo**: `server/boatOptionalsProfile.js`, coluna `bbq_kit_items`, opcionais variados na frota demo; asset **`kit_churrasco.jpg`**; i18n pt / en / es para opcionais e avaliações.

### Alterado

- **Seja locador**: iate decorativo ancorado ao hero (deixa de seguir o viewport no scroll).
- **BoatCard**: transição suave entre fotos do carrossel.
- Composição do kit exibida ao banhista passa a usar a lista cadastrada pelo locador quando existir.

### Versões

- Cliente e servidor **0.13.3**; Android **`versionName` 0.13.3**, **`versionCode` 11**.

---

## [0.13.2] — 2026-05-10

### Adicionado

- **Seja locador** (`SejaLocador`, rota dedicada): hero, cartão com CTAs, rodapé com link para Explorar, redes e faixa decorativa; animação do iate em **`translate3d`**; revelação ao scroll no **mobile** (`IntersectionObserver`); ícone **X (Twitter)** oficial (preenchido) nas redes decorativas.
- **Explorar**: listagem com **scroll infinito** via **`useBarcosInfinite`**, com disponibilidade por data (**`boatsAvailableOnApi`**) e ajustes de UX (filtros, header, scroll).
- Hooks **`useBoat`**, **`useMatchMediaMdUp`**; script **`npm run clean:vite`** (`scripts/clean-vite-cache.mjs`); script **`npm run fix:seja-locador-alpha`** (`scripts/process-seja-locador-transparent.mjs`) para tratamento de alpha nos PNG da página.
- Ilustrações **`seja-locador-captain`** / **`seja-locador-yacht`** em **`src/assets/`**.
- Tokens Tailwind **`duration-reveal`** e **`ease-reveal`** (transições de revelação mais suaves).

### Alterado

- **SejaLocador**: rodapé com **logo** Alto Mar (**`logo-altomar-light`** / **`logo-altomar-dark`** conforme o tema) em substituição do título em texto puro.
- **SejaLocador**: **sem ilustrações** no fluxo do hero em **mobile**; iate fixo e marinheiro no rodapé apenas a partir de **`lg`**.
- **Reservar**, **DetalhesBarco**, **Home**, **`BoatCalendarPanel`**, **`ExploreFiltersCard`**, **`App`**, **`index.css`**, **i18n** (pt / en / es), **`tailwind.config.ts`**, **`index.html`** e **`server/index.js`**: alinhados a esta entrega (calendário, cópias, rotas e API).

### Removido

- **`src/hooks/useBarcos.ts`** (substituído por **`useBarcosInfinite`** + **`useBoat`**).

### Versões

- Cliente e servidor **0.13.2**; Android **`versionName` 0.13.2**, **`versionCode` 10**.

---

## [0.13.1] — 2026-04-30

### Adicionado

- **Reserva multi-dia (banhista)**: seleção de vários dias no calendário com **highlight** dos dias escolhidos; ao clicar num dia já marcado, desmarca imediatamente (toggle em 1 clique).
- **Opcionais por dia**: bloco **“Dias selecionados”** (exibido a partir de 2+ dias), com configuração por dia para **Kit Churrasco** e **Moto aquática**, incluindo subtotal diário.
- **Persistência por dia na API**: tabela **`booking_days`** (arranque e schemas SQL) para armazenar datas e opcionais de cada dia da reserva.

### Alterado

- **Pagamento multi-dia em reserva única**: múltiplos dias passam a gerar **uma única reserva** com **pagamento único** (total consolidado), mantendo os detalhes por dia em `booking_days`.
- **Calendário público do barco** (`GET /api/boats/:id/calendar`): passa a considerar também os dias ativos de `booking_days` além de `bookings.booking_date`.
- **Validação de conflito de data** (`assertBookingSlotAvailable`): bloqueia datas já ocupadas em reservas aceitas/concluídas tanto no dia principal da reserva como em dias ativos de `booking_days`.
- **UX da página Reservar**: cartões de opcionais (Kit/Moto) reposicionados mais acima; seção “Dias selecionados” refinada visualmente para separar melhor **dia do passeio** e **opcionais**.
- **Detalhes do barco**: seção de opcionais destacada com título **“Opcionais”**, incluindo Kit Churrasco e Moto aquática sem sufixo “(opcional)” nos títulos.

### Versões

- Cliente e servidor **0.13.1**.

---

## [0.12.1] — 2026-04-10

### Adicionado

- **Marinheiro**: secção de reservas **aceites em atraso** (data do passeio já passou e ainda não marcadas como concluídas), com destaque e cópias em **pt / en / es**; o locador só pode **marcar concluído** no dia do passeio ou depois (UI e validação em **`POST /api/owner/bookings/:id/complete`**).

### Alterado

- **Painel do locador** (PT): título **«Painel do Locador»** (singular).
- **Reservar** / **`BoatCalendarPanel`**: calendário com navegação alinhada (mês centrado, setas nas pontas); tema escuro nos botões de mês (contraste sem fundo «quase branco»); barra inferior *sticky* opaca com `z-index` e mais espaço de rodapé; no **mobile**, foco dos botões de mês remove-se após toque; no **desktop** escuro, hover dos botões de mês só escurece o fundo (sem anel/borda).
- **Calendário do dono** (`BoatCalendarPanel` variante **owner**): travas **gravadas** visíveis (correcção do `day_selected` e datas da API); **`GET /api/boats/:id/calendar`** com **`to_char(..., 'YYYY-MM-DD')`**; cliente **`boatCalendarApi`** normaliza `dateLocks` e datas de reservas; rascunho = só **borda vermelha clara**; gravado e **trava por dia da semana** no grid = **mesmo preenchimento vermelho**, **sem borda** colorida nas travas já guardadas.
- **Explorar**, **BoatCard**, **DetalhesBarco**, páginas de **conta** e **autenticação**, **RenterBookingsPanel**, **BoatRoutes**, **BoatLiveGps**, componente **`card`**, **`tailwind.config`** e **`index.css`**: refinamentos de layout e tema alinhados ao restante desta release.

### Corrigido

- **Calendário**: datas de travas/reservas da API alinhadas a **`YYYY-MM-DD`** para os modificadores e estado local coincidirem com o calendário.

### Versões

- Cliente e servidor **0.12.1**; Android **`versionName` 0.12.1**, **`versionCode` 9**.

---

## [0.12.0] — 2026-04-11

### Adicionado

- **`npm run db:refresh-demo-images`**: script que actualiza `boat_images` na BD só para barcos do locador demo (`DEMO_OWNER_EMAIL`), para o site em produção reflectir novos ficheiros em `public/assets/` sem correr o seed completo. Lógica partilhada em **`server/boatDemoImages.js`**.
- **`npm run db:reset-demo-boats`**: apaga só os barcos do locador demo (e **reservas** associadas), recria **≥30** embarcações com imagens do pack. Não remove barcos de outros utilizadores. Geração/persistência partilhadas em **`server/demoFleet.js`** (o **seed** global também passou a usar este módulo).
- **Barra de navegação inferior (mobile)** em **`/explorar`** (`MobileNavHost`, montado em **`App`**): **locatário** — Meus barcos, Favoritos, Conta e Menu (sheet com `SettingsMenuPanel`); **banhista** — Favoritos, Minhas reservas, Conta (sem item Explorar nem menu na barra); **visitante** — atalhos para login com contexto (favoritos, reservas, entrar).
- **Página `/conta/reservas`** para o banhista com `RenterBookingsPanel` (deixa de ser só redireccionamento para âncora em `/conta`); atalhos em Explorar, `HeaderSettingsMenu` e conta.
- **`SettingsMenuPanel`** em `HeaderSettingsMenu.tsx` (reutilizável na barra inferior e no menu do cabeçalho); **`loginLocationState.ts`** para `location.state` no login.
- **Documentação** de desenho da integração Stripe: `docs/STRIPE-INTEGRATION-DESIGN.md` (e export HTML/PDF).

### Alterado

- **`vercel.json`**: o rewrite SPA deixa de abranger **`/assets/*`** e **`/api`** — evita servir `index.html` no lugar dos PNG (imagens partidas ou que parecem não actualizar).
- **`refresh-demo-boat-images`**: registo da BD usada (host mascarado); variável **`REFRESH_ALL_BOAT_IMAGES=1`** para actualizar fotos de **todos** os barcos.
- **Marinheiro**: secção de reservas colapsável no mobile; lista de barcos com linha expansível (editar/apagar); **polling silencioso a cada 5 s** (e ao voltar ao separador) em reservas do locatário; `carregarPendentes` com modo silencioso.
- **RenterBookingsPanel**: actualização periódica (5 s) e ao foco/visibilidade; recarga silenciosa após acções; **`ContaUsuario`** com atalho para reservas em vez de bloco embutido.
- **BoatCalendarPanel** (variante dono): travas em vermelho; datas **só seleccionadas** (ainda não gravadas) com anel suave; travas **gravadas** e **por dia da semana** com preenchimento; legenda alinhada.
- **ContaFavoritos**: botão voltar leva a **`/explorar`**.
- **Explorar**, **Login**, **DetalhesBarco**, **Home**, **ExploreFiltersCard**, **`auth.ts`**, **`server/index.js`**, **Capacitor/Android**, **`.env.example`**, **Tailwind** e **i18n** (pt/en/es): ajustes associados ao fluxo mobile, conta e API.

### Documentação

- **README** e **`docs/DEPLOY.md`**: nota de que o Explorar usa URLs da base de dados e como refrescar imagens após deploy do front.

### Versões

- Cliente e servidor **0.12.0**; Android **`versionName` 0.12.0**, **`versionCode` 8**.

---

## [0.11.1] — 2026-04-05

### Adicionado

- **`public/assets/`**: imagens de demonstração por tipo de embarcação em **PNG** (exterior + dois interiores: lancha, veleiro, catamarã, iate, escuna, moto aquática, saveiro, lancha inflável).

### Alterado

- **`server/seed.js`** e **`src/data/embarcacoes.ts`**: URLs de fotos alinhadas ao pack (`/assets/*_exterior.png`, `*_interior_1.png`, `*_interior_2.png`); **Moto aquática** passa a usar três imagens como os restantes tipos.

### Documentação

- **`public/assets/PHOTO_CREDITS.txt`**: referência ao pack do projecto; mantém nota sobre `boat-*.jpg` genéricos.

### Documentação / versões

- **Semver**: cliente e servidor **0.11.1**; Android `versionName` **0.11.1**, `versionCode` **7**.

---

## [0.11.0] — 2026-04-03

### Adicionado

- **Explorar (banhista)**: imagem de fundo no herói (`explore-banhista-hero`) com overlay e desvanecimento ao scroll; animação Tailwind **`explore-pill-in`** (e keyframes associados) na transição cartão de filtros ↔ pílula **Buscar e filtrar**.
- **Filtros**: estado colapsado com **histerese** de scroll (evita flicker); abertura manual com âncora de scroll; ícones de filtro maiores e cartão até **`max-w-2xl`**, alinhado à coluna do título.
- **Header Explorar**: barra única *sticky* com grelha **`1fr auto 1fr`** (logo · filtros centrados · conta).
- **Listagem**: secções por destaque (melhor avaliação, melhor preço, por tipo de embarcação); cópias em **pt / en / es** (incl. `filtersCollapsedCta`, `sectionBestPriceHint`).
- **Branding**: logo escuro (`logo-altomar-dark.png`) para tema escuro no header.

### Alterado

- **Explorar**: fluxo visual e cópias (título principal sem parágrafo introdutório removido do layout); **ExploreFiltersCard** sem `lg:max-w-none` forçado; **sheet** e outros ajustes de UI em ficheiros tocados nesta release.
- **Barcos e reservas**: tipos e filtros de exploração (`boatVesselTypes`, `exploreFilters`, `useBarcos`); cartões e páginas **Detalhes**, **Reservar**, **Marinheiro**; painel de reservas do banhista alinhados ao modelo e à API.
- **Base de dados**: `schema.sql`, `schema-cloud.sql`, `docker/init` e script **`jet_ski_option.sql`**; ajustes em **seed** e auth no servidor.
- **API**: o servidor **termina ao arrancar** se `JWT_SECRET` estiver em falta ou vazio; removido o fallback inseguro nos tokens JWT.

### Documentação

- **README** e **`server/.env.example`**: `JWT_SECRET` obrigatório; CORS em produção (`CORS_STRICT`, `FRONTEND_URL`, `EXTRA_CORS_ORIGINS`).

### Documentação / versões

- **Semver**: cliente e servidor **0.11.0**; Android `versionName` **0.11.0**, `versionCode` **6**.

---

## [0.10.6] — 2026-04-04

### Adicionado

- **Detalhes do barco**: deslize horizontal entre fotos no telemóvel.
- **Minhas reservas (banhista)**: cartões **compactos** para concluídas e **outros estados** (expandir ao toque); motivo de remarcação **Outro** (`OTHER`) alinhado à API.
- Indicador **verde** junto ao título **Em curso** quando existem reservas aceites (não no estado vazio).
- **`src/lib/rescheduleReasons.ts`** e ficheiros SQL de referência em `db/` (`boat_embark_slots`, `booking_reschedule_justification`).

### Alterado

- **Reserva pendente**: o banhista pode **alterar a data do passeio** livremente; justificativa obrigatória de remarcação mantém-se só após **aceite** pelo locador. API `PATCH /api/renter/bookings/:id` e UI (`RenterBookingsPanel`) actualizados; limpeza de campos `reschedule_*` na BD ao mudar data em `PENDING`.
- **Terminologia PT**: “locatário” (dono do barco) → **locador** / **Painel dos Locadores** onde aplicável; role técnica `locatario` na API e na BD mantida.
- **Reservar / edição de reservas**: textos de embarque **local** vs **horário** “a combinar” por secção (i18n).
- **Servidor**: mensagens de validação de embarque e 404 de barco do locador; enum de remarcação com `OTHER`.

### Documentação / versões

- **Semver**: cliente e servidor **0.10.6**; Android `versionName` **0.10.6**, `versionCode` **5**.

---

## [0.10.5] — 2026-04-03

### Corrigido

- **AppVersionStamp** / rodapé de versão: o semver passa a ser lido directamente de `package.json` em `src/lib/appVersion.ts` (import JSON), em vez de `define.__APP_VERSION__` no `vite.config.ts` (valor fixo no arranque do Vite). Evita mostrar uma versão antiga no UI (ex.: **v0.10.3** com `package.json` já em **0.10.4**) até reiniciar o dev server; o hash Git continua a ser injectado no arranque (`__GIT_COMMIT__`).

### Documentação / versões

- **Semver**: cliente e servidor **0.10.5**; Android `versionName` **0.10.5**, `versionCode` **4**.

---

## [0.10.4] — 2026-04-03

### Adicionado

- **Avaliações pós-passeio**: tabela `booking_ratings`; banhista avalia a embarcação; locador avalia o banhista; recálculo de `boats.rating` e `users.guest_rating`.
- **API**: `POST /api/renter/bookings/:id/rate-boat`, `POST /api/owner/bookings/:id/rate-renter`; `GET /api/me` inclui `guest_rating`.
- **Minha conta (banhista)**: nota como cliente no cartão do topo; **Minhas reservas** na própria página `/conta`; **Meus favoritos** em `/conta/favoritos`; `/conta/reservas` redirecciona para `/conta#conta-reservas`.
- **Banhistas**: `POST /api/renter/bookings/:id/cancel` e botão **Cancelar reserva** (pendente ou aceite).
- **Marinheiro**: secção **Passeios concluídos** com avaliação ao banhista.
- **Definições** (menu lateral): rodapé com **versão do app** (`AppVersionStamp`), alinhado ao `package.json` / build Vite.

### Alterado

- Schema SQL e `ensureBookingRatingsTable` no servidor; ficheiros `db/booking_ratings.sql` e entradas em `schema.sql`, `schema-cloud.sql`, `docker/init`.

### Documentação / versões

- **Semver**: cliente e servidor **0.10.4**; Android `versionName` **0.10.4**, `versionCode` **3**.

---

## [0.10.3] — 2026-04-02

### Adicionado

- **PostgreSQL local (Docker)**: volume `docker/init` montado em `docker-entrypoint-initdb.d` para aplicar o schema inicial (`docker/init/01-schema.sql`) na primeira criação do volume; **healthcheck** com `pg_isready`.
- Script **`scripts/wait-for-pg.mjs`** e comandos npm **`db:wait`** e **`db:setup`** (subir o Postgres, esperar ficar pronto e correr o seed).
- **Explorar**: sugestões de localização com **correspondência aproximada** (distância de edição) sobre a lista de cidades do litoral do RJ, para quando o texto tem erros de digitação.

### Alterado

- **Vite**: proxy `/api` para `127.0.0.1:3001` com timeout alargado, mensagem de erro no **502** quando a API cai, e o **mesmo proxy em `vite preview`** para testar o build local com a API.
- **Marinheiro**: hub simplificado (incluindo remoção do atalho **Reservas** redundante face ao painel de reservas).
- **BoatCalendarPanel**: calendário utilizável para navegação (sem bloqueio de interacção que impedia mudar mês).
- **API / cliente**: ajustes em reservas, calendário e filtros de exploração (`fetchBoatsApi`, `useBarcos`, `exploreFilters`, `Explorar`, `Reservar`, `ContaReservas`).
- **Logo** (`logo-altomar.png`) e pequenos ajustes em **definições / selector de idioma** e componente **Sheet**.
- Traduções **pt / en / es** para chaves novas ou actualizadas.

### Documentação

- **`server/.env.example`**: variáveis adicionais alinhadas ao ambiente local.

---

## [0.10.2] — 2026-04-02

### Alterado

- **Painel dos locadores (Marinheiro)**: secção **Reservas** (pendentes + em curso) movida para o **topo** do painel.
- Botão **Reservas** com indicador visual: realça quando a lista de reservas muda (nova reserva ou alteração), **badge** com quantidade de pendentes e ponto de atenção; estado “visto” persistido em `sessionStorage` (sem notificação push). Aceitar/recusar/concluir não dispara o indicador pela própria acção do locador.

### Adicionado

- Chaves i18n **pt / en / es**: `bookingsHubTitle`, `reservationsButton`, `reservationsButtonTitle`, `bookingsHubHint`.

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
- Página **Conta → Reservas** (banhista): estados, edição, repasse a pendente para o locador.
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

- Melhorias de **UX** no formulário de barco do locador e tratamento de **roteiros**.

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
- **Gestão de barcos** do locador no painel.
- **Página de conta** e **favoritos persistentes** (API dedicada).
- Melhorias na conta (secção de rotas, destino ao **logout**); carregamento de favoritos pela API.

### Documentação

- Ajustes e troubleshooting de **CORS** e **502** (Railway).

---

## [0.3.0] — 2026-03-19

### Adicionado

- **API Node + PostgreSQL**: utilizadores, barcos, imagens, reservas, integração **Mercado Pago**, favoritos.
- **Autenticação** (login/registo) e papéis **banhista** / **locador** (role API: `locatario`).
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

- A tag **`v0.12.1`** marca o estado actual do código alinhado a este changelog.
- Versões **0.1.0–0.9.0** são documentais (histórico retroactivo); pode criar tags adicionais nos commits antigos se precisar de comparações no GitHub.
