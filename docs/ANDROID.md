# Alto Mar — App Android (Capacitor)

App híbrido: React (Vite) dentro de WebView Android (`com.altomar.app`).

## Requisitos

- Node.js 20+
- JDK 21 (alinhado com `capacitor.build.gradle`)
- Android Studio + Android SDK (compile/target SDK 36)
- Para **push**: projecto Firebase + `android/app/google-services.json`

## Build rápido (debug)

```bash
npm run android:build
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Desenvolvimento em tempo real (live reload)

O app Android carrega o **Vite** no seu PC — alterações no React aparecem ao guardar, sem rebuild do APK.

### Opção A — um comando (recomendado)

Telefone na **mesma Wi‑Fi** que o PC, depuração USB opcional:

```bash
npm run android:live:full
```

Emulador Android:

```bash
npm run android:live:full:emu
```

### Opção B — dois terminais

**Terminal 1** — front + API local:

```bash
# Telefone físico (substitua pelo IP que o script mostrar, ex. 192.168.0.12)
$env:VITE_HMR_HOST="192.168.0.12"; npm run dev:all

# Emulador
npm run dev:all
```

**Terminal 2** — instala/abre o app com live reload:

```bash
npm run android:live          # telefone
npm run android:live:emu      # emulador
```

### API durante live reload

| API | Como |
|-----|------|
| **Local** (default) | `dev:all` — `/api` no Vite faz proxy para `localhost:3001` |
| **Railway (produção)** | `$env:VITE_API_BASE_URL="https://alto-mar-production.up.railway.app"; $env:VITE_API_ALWAYS_DIRECT="1"; npm run dev:all` |

### Requisitos

- PC e telefone na mesma rede (Wi‑Fi); firewall do Windows a permitir porta **8080**
- **JDK 21** / Android Studio (para `cap run android`)
- Dispositivo ou emulador visível em `adb devices`

Para voltar ao APK “embalado”, faça `npm run android:build` **sem** `-l` (live reload só vale na sessão `cap run`).

## Build release (assinado)

1. Criar keystore e configurar `android/keystore.properties` (não commitar).
2. Ver `android/app/build.gradle` — bloco `signingConfigs` (quando activado).
3. `npm run android:build:release`

## API em dispositivo físico

| Ambiente | URL da API |
|----------|------------|
| Emulador Android | `http://10.0.2.2:3001` (fallback automático em `src/lib/auth.ts`) |
| Telefone na rede local | Build com `VITE_API_BASE_URL=http://IP_DO_PC:3001` |
| Produção | `VITE_API_BASE_URL=https://sua-api.railway.app` |

Exemplo:

```bash
# Windows PowerShell
$env:VITE_API_BASE_URL="https://sua-api.example.com"; npm run android:build
```

A API deve expor CORS para origem `https://localhost` (Capacitor WebView).

## Permissões Android

Declaradas em `android/app/src/main/AndroidManifest.xml`:

| Permissão | Uso |
|-----------|-----|
| `INTERNET` | API, mapas, Stripe |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Mapas e GPS (quando activado no app) |
| `POST_NOTIFICATIONS` | Notificações push (Android 13+) |
| `VIBRATE` | Alertas de notificação |
| `ACCESS_NETWORK_STATE` | Detecção de conectividade |

**Localização em background** não está activa no produto — não pedimos `ACCESS_BACKGROUND_LOCATION` em runtime.

Pedido em código: `src/lib/capacitorNative.ts` (`requestLocationPermission`, `initPushNotifications`).

## Push (Firebase Cloud Messaging)

1. [Firebase Console](https://console.firebase.google.com/) → app Android `com.altomar.app`
2. Descarregar `google-services.json` → `android/app/google-services.json`
3. Rebuild — o plugin `google-services` aplica-se automaticamente se o ficheiro existir.
4. **Servidor:** em `server/.env`, definir `FCM_SERVER_KEY` (chave legada do projecto Firebase → Cloud Messaging). Sem esta variável, as notificações in-app funcionam; o push nativo não é enviado.
5. **Build do app:** só activar push nativo com `VITE_NATIVE_PUSH=1` no build **depois** de colocar `google-services.json`. Sem Firebase, o registo FCM crashava o app — por defeito push nativo fica desligado.

O cliente regista o token em `POST /api/notifications/push-token` após login. Eventos de reserva (nova reserva, pagamento, aceite, cancelamento, etc.) persistem em `app_notifications` e disparam push quando FCM está configurado.

Sem FCM: o app funciona; push falha silenciosamente no registo/envio.

## Limitações do app Android

1. **Shell WebView** — UI é web; performance/animações dependem do WebView do dispositivo.
2. **Rede obrigatória** — sem cache offline de reservas.
3. **Stripe Checkout** — fluxo de pagamento abre browser / Custom Tab, não WebView interno (recomendado Stripe).
4. **GPS ao vivo** — componente actual usa simulação; permissões já preparadas para GPS real futuro.
5. **Notificações** — centro in-app (polling + sino no header/painel locador); push Android via FCM quando `google-services.json` e `FCM_SERVER_KEY` estão configurados.
6. **Ficheiros / câmara** — upload de anexos usa input web; testar em dispositivo real.
7. **minSdk 24** — Android 7.0+; dispositivos mais antigos não suportados.
8. **Mixed content** — `allowMixedContent` activo só para dev (API HTTP no emulador); produção deve usar HTTPS.
9. **Back button** — histórico do router; na raíz fecha o app (`App.exitApp()`).
10. **Safe area** — layout mobile usa `env(safe-area-inset-*)` no painel locador.

## Scripts npm

| Script | Descrição |
|--------|-----------|
| `npm run cap:sync` | `vite build` + `cap sync android` |
| `npm run android:open` | Abre projecto no Android Studio |
| `npm run android:build` | Sync + APK debug |
| `npm run android:build:release` | Sync + APK/AAB release (requer assinatura) |
| `npm run android:live:full` | Vite + API + app Android com live reload |
| `npm run android:live:full:emu` | Idem, em emulador |
| `npm run android:live` | Live reload (Vite já a correr noutro terminal) |

## Versão

`versionCode` / `versionName` em `android/app/build.gradle` — alinhar com `package.json` em releases.
