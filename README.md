# BarrioAnuncios 🏘️

Plataforma SaaS de anuncios para barrios semi cerrados. Stack: Next.js 14 + Supabase + MercadoPago + Cloudflare.

---

## 🏗️ Arquitectura

```
Browser (React/Next.js)
    ↓ JWT en cookie HTTPOnly
Cloudflare Edge (WAF + Rate Limiting)
    ↓
Next.js Middleware (verificación de sesión y rol)
    ↓
Server Components / Route Handlers
    ↓ JWT del usuario o service role
Supabase (PostgreSQL + RLS + Edge Functions)
    ↓
MercadoPago API (solo desde Edge Functions)
```

**Principio de seguridad**: El frontend nunca toca credenciales de MercadoPago, nunca bypasea RLS, nunca confía en su propio input.

---

## ⚡ Setup local

### 1. Prerrequisitos

```bash
node >= 20
npm >= 10
supabase CLI: npm install -g supabase
```

### 2. Clonar y dependencias

```bash
git clone https://github.com/tu-usuario/barrio-anuncios
cd barrio-anuncios
npm install
```

### 3. Variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local con tus valores reales
```

### 4. Supabase local

```bash
supabase start
# Toma unos minutos la primera vez

# Aplicar el schema
supabase db push
# O ejecutar manualmente en el SQL editor:
# supabase/migrations/001_schema.sql
```

### 5. Configurar secrets de Edge Functions

```bash
supabase secrets set MP_ACCESS_TOKEN=tu_token
supabase secrets set MP_WEBHOOK_SECRET=tu_secret
supabase secrets set APP_URL=http://localhost:3000
```

### 6. Deploy de Edge Functions

```bash
supabase functions deploy crear-anuncio
supabase functions deploy crear-preferencia-mp
supabase functions deploy webhook-mp
supabase functions deploy activar-anuncio
supabase functions deploy expirar-anuncios
```

### 7. Correr el proyecto

```bash
npm run dev
# http://localhost:3000
```

---

## 🚀 Deploy en producción (Cloudflare Pages)

### 1. Supabase producción

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar el SQL de `supabase/migrations/001_schema.sql` en el SQL Editor
3. Habilitar extensiones: `uuid-ossp`, `pg_cron`
4. Configurar Auth:
   - Site URL: `https://tu-dominio.com`
   - Redirect URLs: `https://tu-dominio.com/**`
5. Configurar Edge Functions secrets (Dashboard > Edge Functions > Secrets):
   ```
   MP_ACCESS_TOKEN = tu_token_de_mp
   MP_WEBHOOK_SECRET = tu_secret
   APP_URL = https://tu-dominio.com
   SUPABASE_SERVICE_ROLE_KEY = tu_service_role_key
   ```
6. Deploy de Edge Functions:
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase functions deploy --no-verify-jwt crear-anuncio
   supabase functions deploy --no-verify-jwt crear-preferencia-mp
   supabase functions deploy --no-verify-jwt webhook-mp
   supabase functions deploy --no-verify-jwt activar-anuncio
   supabase functions deploy --no-verify-jwt expirar-anuncios
   ```

### 2. MercadoPago

1. Crear cuenta y aplicación en [developers.mercadopago.com](https://developers.mercadopago.com)
2. Obtener **Access Token** (producción) y **Public Key**
3. Configurar webhook:
   - URL: `https://tu-dominio.com/api/webhooks/mercadopago`
   - Eventos: `payment`
   - Copiar el **Secret** generado → `MP_WEBHOOK_SECRET`

### 3. Cloudflare Pages

```bash
# Instalar Wrangler
npm install -g wrangler
wrangler login

# Deploy
wrangler pages deploy .next --project-name barrio-anuncios
```

O conectar el repositorio desde el Dashboard de Cloudflare:
1. Pages > Create a project > Connect to Git
2. Framework preset: **Next.js**
3. Build command: `npm run build`
4. Build output: `.next`

**Variables de entorno en Cloudflare** (Settings > Environment variables):

| Variable | Tipo | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain | `eyJ...` |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Plain | `APP_USR-xxx` |
| `NEXT_PUBLIC_APP_URL` | Plain | `https://tu-dominio.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | `eyJ...` |
| `MP_ACCESS_TOKEN` | **Secret** | `APP_USR-000...` |
| `MP_WEBHOOK_SECRET` | **Secret** | `tu_secret` |

### 4. Cloudflare WAF (recomendado)

En Cloudflare Dashboard > Security > WAF:

**Regla 1: Rate limit en API**
- Path: `/api/*`
- Rate: 60 requests/min por IP
- Action: Block

**Regla 2: Proteger webhook**
- Path: `/api/webhooks/mercadopago`
- Condition: IP NOT IN MercadoPago IP ranges
- Action: Block (consultar IPs actuales en docs de MP)

### 5. Primer admin

Después del primer registro, ejecutar en Supabase SQL Editor:

```sql
-- Reemplazar con el email del primer admin
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@tu-dominio.com'
);
```

### 6. Configurar cron job de expiración

En Supabase Dashboard > Database > pg_cron o SQL Editor:

```sql
SELECT cron.schedule(
  'expirar-anuncios-diario',
  '0 6 * * *',  -- 06:00 UTC = 03:00 ART
  $$
    SELECT net.http_post(
      url := 'https://TU_PROJECT_ID.supabase.co/functions/v1/expirar-anuncios',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    );
  $$
);
```

---

## 🔐 Seguridad: checklist de producción

- [ ] Variables de entorno configuradas como **Secrets** (nunca en texto plano)
- [ ] `.env.local` en `.gitignore` (nunca commitear)
- [ ] RLS activo en todas las tablas (verificar con `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`)
- [ ] Webhook de MP con firma HMAC verificada
- [ ] Headers de seguridad configurados en Cloudflare
- [ ] Rate limiting activo
- [ ] Primer admin creado via SQL (nunca via UI pública)
- [ ] Email de confirmación activo en Supabase Auth
- [ ] Logs de auditoría revisados en los primeros días

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── (public)/           # Rutas sin autenticación
│   │   ├── page.tsx        # Landing
│   │   ├── login/
│   │   ├── register/
│   │   └── anuncios/       # Listado público
│   ├── (auth)/
│   │   ├── dashboard/      # Panel del usuario
│   │   └── admin/          # Panel del admin
│   └── api/
│       ├── webhooks/mercadopago/   # Receptor de webhook MP
│       └── admin/users/            # API de gestión de usuarios
├── components/
│   ├── layout/             # Sidebar, TopBar
│   ├── anuncios/           # Componentes de anuncios
│   ├── dashboard/          # ProfileForm, ChangePasswordForm
│   └── admin/              # UserActionsMenu
├── lib/
│   ├── supabase/           # client.ts, server.ts
│   └── utils/              # validations.ts, helpers.ts
├── types/                  # index.ts — tipos globales
└── middleware.ts            # Auth guard en edge

supabase/
├── functions/              # Edge Functions (Deno)
│   ├── crear-anuncio/
│   ├── crear-preferencia-mp/
│   ├── webhook-mp/
│   ├── activar-anuncio/
│   └── expirar-anuncios/
└── migrations/
    └── 001_schema.sql
```

---

## 🧪 Testing del webhook localmente

```bash
# Instalar stripe CLI o usar ngrok para exponer localhost
ngrok http 3000

# Simular webhook de MP (ajustar URL y datos)
curl -X POST https://tu-ngrok-url.ngrok.io/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=1234567890,v1=HASH_VALIDO" \
  -H "x-request-id: test-123" \
  -d '{"type":"payment","data":{"id":"123456789"}}'
```

---

## 📝 Variables de entorno: referencia completa

| Variable | Scope | Obligatoria | Descripción |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | ✅ | Anon key (pública, con RLS) |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Browser | ✅ | Public key de MercadoPago |
| `NEXT_PUBLIC_APP_URL` | Browser + Server | ✅ | URL de la app en producción |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo server** | ✅ | Service role key — NUNCA al browser |
| `MP_ACCESS_TOKEN` | **Solo server** | ✅ | Access token de MP — NUNCA al browser |
| `MP_WEBHOOK_SECRET` | **Solo server** | ✅ | Secret HMAC para verificar webhooks |

---

## 🤝 Contribuir

1. Fork del repo
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: descripción'`
4. Push y Pull Request

Seguir [Conventional Commits](https://www.conventionalcommits.org/).
