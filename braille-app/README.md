# Braillito - Aprende Braille Jugando 🎮

Una aplicación web progresiva (PWA) para aprender Braille a través de minijuegos interactivos en español.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build producción
npm run build

# Ejecutar tests
npm run test
```

La app estará disponible en `http://localhost:5173/`

## 📁 Estructura del Proyecto

```
braille-app/
├── index.html          # Pantallas de la aplicación
├── app.js              # Lógica principal (navegación, estado, servicios)
├── braille-data.js     # Alfabeto Braille, niveles, logros
├── styles.css          # Estilos globales
├── manifest.json       # Configuración PWA
├── service-worker.js   # Cache para uso offline
├── vite.config.js      # Configuración Vite + Vitest
│
├── api/
│   └── tts.js          # API de texto a voz (Vercel serverless)
├── server/
│   └── tts-server.js   # Servidor TTS para desarrollo local
├── public/
│   ├── *.png           # Iconos y assets
│   └── mascot.svg      # Mascota SVG reutilizable
├── src/
│   ├── games/          # Módulos de minijuegos
│   │   ├── GuessLetterGame.js
│   │   ├── FormWordGame.js
│   │   └── MemoryGame.js
│   └── lib/            # Servicios externos
│       ├── supabase.js        # Cliente Supabase
│       ├── dataSync.js        # Sincronización de datos
│       └── stateMigration.js  # Migración de estado
│
├── styles/             # CSS modular
│   ├── base.css        # Tokens, reset, contenedores
│   ├── components.css  # Botones, tarjetas, toggles
│   └── index.css       # Índice de imports
│
├── supabase/           # Migraciones de base de datos
│   └── migrations/
│
└── tests/              # Tests con Vitest
    ├── braille-data.test.js
    └── state-migration.test.js
```

## 🎯 Características

- **Lecciones estructuradas**: Currículo completo del alfabeto Braille (A-Z)
- **Minijuegos**: Adivina la letra, Forma la palabra, Memoria
- **Accesibilidad**: Soporte para lectores de pantalla, alto contraste, retroalimentación háptica
- **PWA**: Instalable en dispositivos móviles
- **Mascota**: Braillito te acompaña en tu aprendizaje

## 🛠️ Tecnologías

- **Vite** - Bundler y servidor de desarrollo
- **Vitest** - Testing framework
- **Vanilla JS** - Sin frameworks, código puro
- **CSS Custom Properties** - Sistema de diseño con tokens
- **Tailwind CSS** - Utilidades complementarias
- **Supabase** - Base de datos y autenticación
- **Vercel** - Hosting y funciones serverless

## 📱 Despliegue

La app está configurada para despliegue automático en Vercel:

```bash
# Build automático en Vercel
vercel
```

## 🧩 Módulos Principales

| Archivo | Responsabilidad |
|---------|-----------------|
| `app.js` | Navegación, estado y servicios |
| `src/games/` | Minijuegos modulares (Adivina, Forma, Memoria) |
| `src/lib/` | Supabase, sync, migración de estado |
| `braille-data.js` | Datos del alfabeto Braille, niveles, logros |
| `src/lib/supabase.js` | Cliente y autenticación Supabase |
| `src/lib/dataSync.js` | Sincronización de estado con base de datos |
| `src/games/*.js` | Módulos de minijuegos (pattern para futura extracción) |
| `styles.css` | Estilos globales |

## ✅ Pruebas

```bash
npm test
```

## 🔧 Variables de Entorno

```bash
# Supabase (requerido)
VITE_SUPABASE_URL=<tu_url>
VITE_SUPABASE_ANON_KEY=<tu_key>

# Google TTS (opcional)
GOOGLE_APPLICATION_CREDENTIALS_JSON=<credenciales>
```

## 📝 Licencia

Proyecto privado - Todos los derechos reservados.
