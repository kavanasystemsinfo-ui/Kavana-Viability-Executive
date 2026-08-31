# CI/CD de Kavana Apartaments: guia de puesta en marcha

Este documento es la guia operativa de la tarea 5. Explica paso a paso como
dejar funcionando CI, despliegue de la web en Vercel y despliegue de la API en
Render. Todo lo que no se pudo verificar desde este entorno sin credenciales
esta marcado como "SUPUESTO A VALIDAR".

## Que hay en el repositorio

| Archivo | Para que sirve |
| --- | --- |
| `.github/workflows/ci.yml` | CI: lint + test + build con Nx en cada PR y en cada push a master (Node 22.x, `npm ci`, `npx nx run-many -t lint test build`). |
| `.github/workflows/deploy-web.yml` | Despliega `apps/web` en Vercel (produccion) cuando algo llega a master. Usa el CLI de Vercel con el flujo `vercel pull` + `vercel build` + `vercel deploy --prebuilt`, el patron que Vercel documenta oficialmente para GitHub Actions. |
| `vercel.json` | Configuracion del proyecto Vercel: framework Angular, `npm ci` como instalacion, `npx nx build web` como build y `dist/apps/web/browser` como directorio de salida. |
| `.github/workflows/deploy-api.yml` | Dispara el deploy de `apps/api` en Render llamando al deploy hook (un `curl -X POST` a la URL firmada). |
| `render.yaml` | Blueprint de Render: crea el servicio `kavana-apartaments-api` (tipo web, runtime node, plan free) con `npm ci && npx nx build api` y `node dist/apps/api/main.js`. Los secretos van con `sync: false` y se piden una sola vez en el asistente de creacion. |

## Pasos para Jorge

### 1. Crear el repositorio en GitHub y subir master

1. Entra en github.com/new y crea un repositorio **privado** llamado
   `kavana-apartaments` (sin README ni .gitignore, el repo ya tiene ambos).
2. En la terminal, dentro de `/root/kavana-apartaments`:

   ```
   git remote add origin https://github.com/<tu-usuario>/kavana-apartaments.git
   git push -u origin master
   ```

   (Con SSH: `git@github.com:<tu-usuario>/kavana-apartaments.git`).
3. Protege master para que el CI sea el gate del despliegue:
   GitHub > repo > Settings > Branches > Add branch ruleset > **master** >
   marcar "Require status checks to pass" > buscar el check **ci** (es el
   nombre del job) > Save. Asi un push con CI en rojo se rechaza y los
   despliegues nunca se disparan con codigo roto.
   SUPUESTO A VALIDAR: el nombre del repositorio en GitHub no tiene que
   coincidir con nada (Vercel y Render usan su propio nombre de proyecto).

### 2. Crear el proyecto en Vercel y anadir sus variables

1. Entra en vercel.com con la cuenta de la empresa.
2. New Project > importa el repositorio de GitHub recien creado. Vercel lee
   `vercel.json`, asi que el framework (Angular), el build
   (`npx nx build web`) y el output (`dist/apps/web/browser`) se rellenan
   solos. Comprueba que quedan asi antes de continuar.
3. Desconecta la integracion de git de Vercel (Settings > Git > Disconnect)
   para que Vercel no despliegue por su cuenta. En este diseno el unico que
   despliega es GitHub Actions; si dejas ambas, cada push genera dos
   despliegues.
4. Anade la variable de entorno (Settings > Environment Variables > add):
   - `CLERK_PUBLISHABLE_KEY` = tu publishable key real de Clerk (Production).
   SUPUESTO A VALIDAR: el codigo actual de `apps/web` (environment.ts) no lee
   la key de ninguna variable de entorno del build, asi que esta variable solo
   surtira efecto cuando la tarea 4 inyecte la key en el build (por ejemplo,
   con fileReplacements o leyendo `process.env.NG_APP_CLERK_PUBLISHABLE_KEY`
   en environment.ts). Hasta entonces la web arranca pero ninguna ruta
   protegida autentica.

### 3. Crear el token de Vercel y los secrets de GitHub

1. Genera el token: vercel.com > Account Settings > Tokens > Create Token
   (nombre `github-actions`, caducidad a tu eleccion, scope Full Account). Es
   el unico dato que permite a Actions desplegar; guardalo como secret, nunca
   en el repositorio.
2. Obtener los IDs del proyecto. Desde la raiz del repo, con el token:

   ```
   npx vercel link --yes --project kavana-apartaments --token <tu-token>
   ```

   El comando crea `.vercel/project.json` (que ya esta en .gitignore y no se
   sube). Abrelo y copia `orgId` y `projectId`.
3. En GitHub: repo > Settings > Secrets and variables > Actions > New
   repository secret. Crea tres secretos:

   | Secret | Valor |
   | --- | --- |
   | `VERCEL_TOKEN` | El token del paso 1. |
   | `VERCEL_ORG_ID` | El `orgId` del paso 2. |
   | `VERCEL_PROJECT_ID` | El `projectId` del paso 2. |

   No hace falta ningun secret de Clerk en GitHub: en este diseno las claves
   viven en Vercel (web) y en Render (API), y los workflows solo disparan
   despliegues. Los workflows de despliegue no inyectan claves de Clerk en
   ninguna parte, asi que no las añadas por costumbre.

### 4. Crear el servicio de la API en Render

1. Entra en render.com y conecta el repositorio de GitHub (Settings > Git
   providers), dale acceso solo a `kavana-apartaments`.
2. New > Blueprint > selecciona el repositorio. Render lee `render.yaml` y
   crea el servicio `kavana-apartaments-api` (web, runtime node, plan free,
   build `npm ci && npx nx build api`, start `node dist/apps/api/main.js`).
3. El asistente pide los valores de los secretos marcados con `sync: false`:
   `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` y
   `CORS_ORIGINS`. Para CORS_ORIGINS usa la lista de origenes separada por
   comas, por ejemplo:
   `http://localhost:4200,https://kavana-apartaments.vercel.app`
   (ajusta el dominio de Vercel al que quede real tras el primer deploy).
   Despues de crear el Blueprint, los cambios en render.yaml se sincronizan
   solos; los secretos nuevos hay que anadirlos a mano al servicio.
4. SUPUESTO A VALIDAR: Render elige la version de Node por el campo engines
   del package.json (`>=20.0.0`), lo que en agosto de 2026 resuelve a la
   ultima LTS, que cumple de sobra para NestJS. Si quieres fijarla, anade la
   variable `NODE_VERSION=22` en las env vars del servicio.
5. SUPUESTO A VALIDAR: el plan free de Render suspende el servicio a los
   15 minutos sin trafico y tarda en responder el primer request tras
   despertarse (los webhooks de Clerk reintentan, asi que el retraso no pierde
   eventos, pero conviene subir a starter, 7 USD al mes, cuando haya trafico
   real o si los tiempos de respuesta importan).

### 5. Activar el deploy hook de Render

1. En Render, entra en el servicio `kavana-apartaments-api` > Settings >
   Deploy Hooks > copia la URL del hook de la rama master.
2. Anade en GitHub el secret `RENDER_DEPLOY_HOOK_URL` con esa URL (Settings >
   Secrets and variables > Actions).
3. Comprueba el hook desde la terminal:

   ```
   curl -X POST "https://api.render.com/deploy/srv-xxxxxxxx?key=xxxx"
   ```

   Debe responder (2xx) y en el dashboard de Render aparece un deploy nuevo.
   El workflow `.github/workflows/deploy-api.yml` hace exactamente ese curl
   con `-f`: si el hook responde 4xx/5xx, el job falla y se ve en rojo.
   SUPUESTO A VALIDAR: los deploy hooks de Render estan disponibles en el
   plan free (la documentacion los describe como feature estandar de los
   servicios web, sin restriccion de plan, pero no se pudo probar sin cuenta).

### 6. Primer despliegue completo y verificacion

1. Haz un commit cualquiera y `git push origin master` (por ejemplo, el
   primer commit del proyecto: `git add -A && git commit -m "feat: ci/cd" &&
   git push`).
2. Observa en la pestana Actions de GitHub: corre `CI`, y al acabar corren
   `Deploy Web (Vercel)` y `Deploy API (Render)`.
3. Verifica la web: abre el dominio que asigna Vercel al proyecto (en el
   dashboard de Vercel > proyecto > Domains). Debe servir `index.html` y las
   rutas SSR (`/login`, `/dashboard`) deben responder con HTML renderizado.
   SUPUESTO A VALIDAR: que Vercel convierta la carpeta `server` de
   `dist/apps/web` en funciones serverless. Con Angular 17+ y el preset
   Angular de Vercel es el comportamiento estandar, pero no se pudo ejecutar
   `vercel build` aqui sin token. Si en los logs de Actions el paso "Build"
   no generara las funciones, el plan B es ampliar `vercel.json` con un
   bloque `functions` que apunte al server output
   (`dist/apps/web/server/server.mjs` como runtime nodejs) y probar de nuevo.
4. Verifica la API: abre la URL de Render (dashboard de Render > servicio >
   Onrender URL) + `/api/docs`. Debe cargar Swagger. Si da 404, revisa los
   logs del servicio y el valor de CORS_ORIGINS.

## Decisiones tomadas y por que

1. **CI con `nx run-many` en vez de `nx affected`**: en el primer push no
   existe base para comparar, y `affected` con `--base` inexistente puede
   fallar o no detectar cambios. `run-many -t lint test build` es
   determinista y el workspace tiene 3 proyectos (api, api-e2e, web); el
   proyecto api-e2e solo define el target e2e, asi que run-many lo omite sin
   error. Cuando el repo crezca, se puede cambiar a `nx affected`.
2. **CLI de Vercel y no la accion vercel/actions**: el flujo
   `vercel pull` + `vercel build` + `vercel deploy --prebuilt` es el patron
   que Vercel publica en su guia oficial de GitHub Actions (23/07/2026), usa
   exactamente los secrets VERCEL_TOKEN + VERCEL_ORG_ID + VERCEL_PROJECT_ID y
   no anade una dependencia de terceros. El repo vercel/actions solo contiene
   acciones para Docker, no de despliegue.
3. **Deploy web solo en push a master**: el gate de CI verde es la branch
   protection de GitHub (paso 1.3). Es mas simple que encadenar workflows con
   `workflow_run` y no duplica builds. Sin la branch protection, el deploy se
   lanzaria igualmente con CI rojo, por eso la regla es parte de los pasos.
4. **Sin Docker para la API**: Render ejecuta el buildCommand directamente
   sobre el repositorio (runtime node nativo); un Dockerfile ariadiria
   mantenimiento sin beneficio aqui.
5. **Secrets de Clerk en GitHub: ninguno**: los workflows de despliegue no
   construyen con credenciales de Clerk; el CI solo hace lint/test/build, que
   no necesitan claves reales (los tests usan mocks y el build usa los
   placeholders). Las claves reales viven en Vercel y Render.

## Sobre la rama master vs main

El repositorio usa la rama `master` (unica existente). Recomendacion: cuando
se cree el repositorio en GitHub, renombrar a `main`, porque es la convencion
actual de GitHub (los repositorios nuevos nacen con main, y las plantillas y
la mayoria de integraciones asumen main como rama de produccion). El cambio
es un solo comando, idealmente justo despues del primer push, antes de que
haya colaboradores:

```
git branch -m master main
git push -u origin main
```

Hazlo ANTES de los pasos 2 a 5 si quieres main, porque tanto Vercel como
Render preguntan la rama de produccion y conviene decidirlo una sola vez.
Este proyecto NO lo ha hecho a proposito (instruccion de la tarea 5) y todos
los workflows estan escritos sobre master; si se renombra, hay que editar los
tres workflows (cambiar `master` por `main` en los `on:`).

## Puntos que quedan pendientes de validar

- `vercel build` local (la conversion del SSR de Angular a funciones
  serverless) no se pudo ejecutar sin un token real de Vercel. El preset
  Angular del CLI reconoce el layout `dist/<app>/browser` + `dist/<app>/server`
  (verificado en el codigo fuente del CLI 59.10.0), pero la prueba completa es
  el primer despliegue. Plan B documentado en el paso 6.3.
- La inyeccion de CLERK_PUBLISHABLE_KEY en el bundle de la web es trabajo de
  la tarea 4; sin ella la variable de Vercel no llega al cliente.
- El plan free de Render y sus deploy hooks (pasos 4.5 y 5.3).
- La eleccion de Node 22.x en los runners de GitHub Actions: hoy la rama 22
  de Node esta por encima de 22.22.3 (minimo de @angular/build), pero si
  algun runner quedara rezagado, el build de la web fallaria con un error de
  engines claro; en ese caso cambiar setup-node a `24.x`.