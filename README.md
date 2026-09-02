# 🛡️ OSI Model Lab — Simulador Interactivo del Modelo OSI

![Live](https://img.shields.io/badge/Live-GitHub_Pages-39ff14?style=flat-square)
![AI](https://img.shields.io/badge/AI-Groq_Cloud-00fff2?style=flat-square)
![Model](https://img.shields.io/badge/OSI-7_capas-ffb000?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

Herramienta interactiva de estudio y consulta rápida sobre el modelo OSI y TCP/IP, pensada tanto para aprender los fundamentos como para tenerla a mano en el día a día de soporte técnico / SOC. Sin frameworks, un único archivo HTML autocontenido.

**Demo en vivo:** https://edwardvarelamariani-bit.github.io/OSI_model/

---

## 📚 Funcionalidades (9 pestañas)

| Pestaña | Qué hace |
|---|---|
| **Capas OSI** | Las 7 capas con hover + click para expandir función, protocolos, dispositivos, analogía y vectores de ataque típicos de cada una |
| **OSI vs TCP/IP** | Comparativa lado a lado — cómo se mapean las 7 capas de OSI contra las 4 de TCP/IP, que es como se habla en el día a día real |
| **Encapsulación** | Simulador paso a paso (Datos → L7 → L6 → L5 → Segmento → Paquete → Trama → Bits) con tres vistas sincronizadas: una tira de bytes coloreada que **crece** con cada capa (con tooltip explicando cada trozo), una tabla hexadecimal ilustrativa que crece en paralelo, y un carril de 7 capas + historial de pasos ya simulados (clicable para volver atrás) |
| **Captura real** | Hex dump real de dos paquetes capturados con `tcpdump -XX` (un SYN y un ClientHello TLS), coloreado por capa, con el campo SNI destacado y explicado |
| **Troubleshooting** | 13 síntomas típicos de soporte/SOC ("no resuelve DNS", "ARP con MAC duplicada"...) que saltan directo a la capa OSI donde probablemente está el problema |
| **Puertos** | Tabla filtrable de 30 puertos comunes (22, 80, 443, 3389, 514/Syslog...) |
| **FAQ** | 8 preguntas reales que surgieron construyendo esta herramienta — dudas de verdad, no relleno |
| **Autoevaluación** | Test de opción múltiple con corrección instantánea y marcador — banco fijo o generado por IA (ver abajo) |

---

## 🏗️ Arquitectura: dos archivos, por seguridad

Este repo usa **dos versiones del mismo HTML**, a propósito, para no tener que elegir entre "cómodo" y "seguro":

```
OSI_model/
├── index.html          ← esta SÍ va a git / GitHub Pages
├── index_local.html     ← esta NUNCA va a git (está en .gitignore)
├── .github/workflows/generate-osi-questions.yml
├── scripts/generate-osi-questions.mjs
└── questions/osi-quiz.json   ← generado automáticamente, no se edita a mano
```

- **`index.html`** (pública): no contiene ninguna API key. El banco de preguntas es estático (10) o el `questions/osi-quiz.json` que genera el GitHub Action — nunca hay una llamada a ninguna API directamente desde el navegador de quien visite la página.
- **`index_local.html`** (solo local, uso personal): tiene un botón "⚡ Generar preguntas nuevas" que llama a Groq **directamente desde el navegador**, con la API key escrita en el propio código (`GROQ_LOCAL_API_KEY`). Esto es seguro únicamente porque el archivo nunca sale de la máquina — por eso está explícitamente excluido en `.gitignore`.

**Por qué no un único archivo con la key "protegida" de alguna forma:** cualquier key incluida en JavaScript que corre en el navegador es, por definición, visible para quien abra "ver código fuente" — no hay ofuscación que lo resuelva de verdad. La única forma correcta de exponer una key con seguridad real es un backend/proxy que la guarde server-side (ver siguiente sección), o como aquí, no exponerla nunca en el archivo que se publica.

---

## 🤖 Generación de preguntas con IA (Groq)

- **Modelo:** `openai/gpt-oss-120b` (Groq deprecó `llama-3.3-70b-versatile` durante el desarrollo de este proyecto — si el Action empieza a fallar con `model_not_found`, es la primera causa a revisar)
- **GitHub Action** (`.github/workflows/generate-osi-questions.yml`): corre todos los días a las 06:00 UTC, y también se puede lanzar a mano desde la pestaña *Actions* → *Run workflow*
- Usa el secret de repo `GROQ_API_KEY` (Settings → Secrets and variables → Actions) — nunca se escribe en ningún archivo, solo vive en memoria durante la ejecución del Action
- El script (`scripts/generate-osi-questions.mjs`) pide 15 preguntas en JSON estructurado, valida el formato, y escribe `questions/osi-quiz.json`, que el Action commitea automáticamente al repo

**Nota:** el *system prompt* que define qué preguntas pedir vive en **dos sitios distintos y no enlazados** — dentro de `index_local.html` (pide 10) y dentro de `scripts/generate-osi-questions.mjs` (pide 15). Cambiar uno no afecta al otro.

---

## 💻 Cómo levantarlo en local

```bash
git clone git@github.com:edwardvarelamariani-bit/OSI_model.git
cd OSI_model
python3 -m http.server 8000
```

Abre `http://localhost:8000/index.html` (necesitas un servidor local, no doble-click — el `fetch()` del banco de preguntas falla por CORS si lo abres como `file://`).

Para la versión con generación instantánea (`index_local.html`), añade tu propia key de Groq en la constante `GROQ_LOCAL_API_KEY` dentro del archivo antes de abrirlo.

---

## 🔐 Decisiones de seguridad — el porqué, no solo el qué

- **CORS y llamadas desde el navegador:** Groq no garantiza (ni recomienda oficialmente) llamadas directas desde JS de navegador a su API — su propia documentación sugiere un proxy backend para uso client-side. La generación en vivo de `index_local.html` es, por tanto, un uso deliberadamente "no oficial" limitado a entorno local y confiado, no una arquitectura para producción pública.
- **Por qué GitHub Actions y no un proxy en vivo (Cloudflare Workers, etc.):** para el caso de uso (un test de repaso, no una app crítica), un banco que se refresca una vez al día es más que suficiente, y evita mantener infraestructura adicional. Si el caso de uso creciera, la migración natural sería un Worker que oculte la key y sirva sí en tiempo real.
- **Historial de una key expuesta accidentalmente:** durante el desarrollo se pegó una API key en texto plano fuera del secret de GitHub; se roto (revocó y regeneró) inmediatamente. Cualquier key que toque un chat, terminal compartida o log debe tratarse como comprometida, se use o no después.

---

## 🎨 Stack

Vanilla JS, sin frameworks ni build step. Fuentes: `Orbitron`, `Share Tech Mono`, `JetBrains Mono`. Estética cyberpunk (cian/verde sobre fondo oscuro, scanlines, cards colapsables) — mismo lenguaje visual que el resto de las herramientas de entrenamiento de este autor.
