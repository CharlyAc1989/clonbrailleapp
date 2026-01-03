/**
 * Braille Quest - Braille Data and Content (Spanish Version)
 * Complete curriculum with 14 chapters following Spanish Braille Standard
 * 
 * FUENTE ÚNICA DE VERDAD - Braille Español Estándar
 * NO MODIFICAR patrones sin verificar contra el anexo técnico oficial
 */

// Standard 6-dot Braille cell layout:
// [1] [4]
// [2] [5]
// [3] [6]

// ================================
// BRAILLE PATTERNS - SPANISH STANDARD
// ================================

const BRAILLE_ALPHABET = {
    'a': [1],
    'b': [1, 2],
    'c': [1, 4],
    'd': [1, 4, 5],
    'e': [1, 5],
    'f': [1, 2, 4],
    'g': [1, 2, 4, 5],
    'h': [1, 2, 5],
    'i': [2, 4],
    'j': [2, 4, 5],
    'k': [1, 3],
    'l': [1, 2, 3],
    'm': [1, 3, 4],
    'n': [1, 3, 4, 5],
    'ñ': [1, 2, 4, 5, 6],
    'o': [1, 3, 5],
    'p': [1, 2, 3, 4],
    'q': [1, 2, 3, 4, 5],
    'r': [1, 2, 3, 5],
    's': [2, 3, 4],
    't': [2, 3, 4, 5],
    'u': [1, 3, 6],
    'v': [1, 2, 3, 6],
    'w': [2, 4, 5, 6],
    'x': [1, 3, 4, 6],
    'y': [1, 3, 4, 5, 6],
    'z': [1, 3, 5, 6]
};

// Accented vowels (1 cell each - Spanish standard)
const BRAILLE_ACCENTS = {
    'á': [1, 2, 3, 5, 6],
    'é': [2, 3, 4, 6],
    'í': [3, 4],
    'ó': [3, 4, 6],
    'ú': [2, 3, 4, 5, 6],
    'ü': [1, 2, 5, 6]
};

const SPECIAL_SIGNS = {
    'capital': [4, 6],
    'number': [3, 4, 5, 6]
};

const BRAILLE_NUMBERS = {
    '1': [1],
    '2': [1, 2],
    '3': [1, 4],
    '4': [1, 4, 5],
    '5': [1, 5],
    '6': [1, 2, 4],
    '7': [1, 2, 4, 5],
    '8': [1, 2, 5],
    '9': [2, 4],
    '0': [2, 4, 5]
};

// Punctuation - Spanish Braille Standard
const BRAILLE_SYMBOLS = {
    '.': [3],                 // Punto
    ',': [2],                 // Coma
    ';': [2, 3],              // Punto y coma
    ':': [2, 5],              // Dos puntos
    '?': [2, 6],              // Signo de interrogación
    '¿': [2, 6],              // Signo de interrogación de apertura
    '!': [2, 3, 5],           // Signo de exclamación
    '¡': [2, 3, 5],           // Signo de exclamación de apertura
    '(': [2, 3, 5, 6],        // Paréntesis (mismo símbolo abre/cierra)
    ')': [2, 3, 5, 6],        // Paréntesis
    '-': [3, 6],              // Guión
    '"': [2, 3, 6],           // Comillas
    "'": [4]                  // Apóstrofo
};

// Mathematical symbols
const BRAILLE_MATH = {
    '+': [2, 3, 5],
    '−': [3, 6],
    '×': [1, 6],
    '÷': [3, 4],
    '=': [2, 3, 5, 6]
};

// Digital/Special symbols
const BRAILLE_DIGITAL = {
    '@': [5],
    '%': [3, 4, 6],
    '#': [3, 4, 5, 6],
    '/': [3, 4],
    '&': [1, 2, 3, 4, 6]
};

// Dot position descriptions for accessibility (Spanish)
const DOT_POSITIONS = {
    1: 'arriba izquierda',
    2: 'centro izquierda',
    3: 'abajo izquierda',
    4: 'arriba derecha',
    5: 'centro derecha',
    6: 'abajo derecha'
};

// Word corpus for WORDS activities
const WORD_CORPUS = {
    chapter2: ['mama', 'papa', 'sol', 'sal', 'mar', 'pan', 'oso', 'ama'],
    chapter3: ['casa', 'dado', 'foca', 'gato', 'hijo'],
    chapter6: ['amor', 'mesa', 'silla', 'libro', 'perro', 'gato'],
    accents: ['mamá', 'papá', 'café', 'aquí', 'salió', 'menú'],
    dieresis: ['pingüino', 'vergüenza', 'bilingüe']
};

// ================================
// LEVELS - 14 Chapter Curriculum
// ================================

const LEVELS = [
    // ==================== CAPÍTULO 0: ORIENTACIÓN (GRATIS) ====================
    {
        id: '0-1',
        chapter: 0,
        number: 1,
        title: 'Conoce la Celda Braille',
        description: 'Una celda Braille tiene 6 puntos ordenados en 2 columnas. Los puntos 1, 2, 3 están a la izquierda. Los puntos 4, 5, 6 están a la derecha.',
        objectives: [
            'Entender la celda Braille de 6 puntos',
            'Conocer los puntos izquierdos: 1, 2, 3',
            'Conocer los puntos derechos: 4, 5, 6'
        ],
        letters: [],
        gameType: 'observe',
        rounds: 1,
        isPremium: false
    },
    {
        id: '0-2',
        chapter: 0,
        number: 2,
        title: 'Puntos Izquierdos',
        description: 'Practica identificando los puntos 1, 2 y 3 del lado izquierdo de la celda.',
        objectives: [
            'Identificar el punto 1 (arriba izquierda)',
            'Identificar el punto 2 (centro izquierda)',
            'Identificar el punto 3 (abajo izquierda)'
        ],
        letters: [],
        gameType: 'build',
        rounds: 6,
        isPremium: false
    },
    {
        id: '0-3',
        chapter: 0,
        number: 3,
        title: 'Puntos Derechos',
        description: 'Practica identificando los puntos 4, 5 y 6 del lado derecho de la celda.',
        objectives: [
            'Identificar el punto 4 (arriba derecha)',
            'Identificar el punto 5 (centro derecha)',
            'Identificar el punto 6 (abajo derecha)'
        ],
        letters: [],
        gameType: 'build',
        rounds: 6,
        isPremium: false
    },

    // ==================== CAPÍTULO 1: VOCALES (GRATIS) ====================
    {
        id: '1-1',
        chapter: 1,
        number: 4,
        title: 'Vocales a, e, i',
        description: 'Aprende las primeras tres vocales en Braille.',
        objectives: [
            'Aprender la letra a (punto 1)',
            'Aprender la letra e (puntos 1, 5)',
            'Aprender la letra i (puntos 2, 4)'
        ],
        letters: ['a', 'e', 'i'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '1-2',
        chapter: 1,
        number: 5,
        title: 'Vocales o, u',
        description: 'Completa el grupo de vocales con o y u.',
        objectives: [
            'Aprender la letra o (puntos 1, 3, 5)',
            'Aprender la letra u (puntos 1, 3, 6)',
            'Distinguir entre o y u'
        ],
        letters: ['o', 'u'],
        gameType: 'build',
        rounds: 6,
        isPremium: false
    },
    {
        id: '1-3',
        chapter: 1,
        number: 6,
        title: 'Reconoce las Vocales',
        description: 'Identifica rápidamente todas las vocales.',
        objectives: [
            'Reconocer las 5 vocales',
            'Mejorar velocidad de reconocimiento',
            'Distinguir patrones similares'
        ],
        letters: ['a', 'e', 'i', 'o', 'u'],
        gameType: 'pick',
        rounds: 10,
        isPremium: false
    },

    // ==================== CAPÍTULO 2: CONSONANTES ÚTILES (GRATIS) ====================
    {
        id: '2-1',
        chapter: 2,
        number: 7,
        title: 'Letras l, m, p',
        description: 'Aprende tres consonantes muy comunes en español.',
        objectives: [
            'Aprender la letra l (puntos 1, 2, 3)',
            'Aprender la letra m (puntos 1, 3, 4)',
            'Aprender la letra p (puntos 1, 2, 3, 4)'
        ],
        letters: ['l', 'm', 'p'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '2-2',
        chapter: 2,
        number: 8,
        title: 'Letras t, r, s',
        description: 'Continúa con más consonantes frecuentes.',
        objectives: [
            'Aprender la letra t (puntos 2, 3, 4, 5)',
            'Aprender la letra r (puntos 1, 2, 3, 5)',
            'Aprender la letra s (puntos 2, 3, 4)'
        ],
        letters: ['t', 'r', 's'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '2-3',
        chapter: 2,
        number: 9,
        title: 'Letras n, d',
        description: 'Dos consonantes más para formar palabras.',
        objectives: [
            'Aprender la letra n (puntos 1, 3, 4, 5)',
            'Aprender la letra d (puntos 1, 4, 5)',
            'Distinguir n de d'
        ],
        letters: ['n', 'd'],
        gameType: 'build',
        rounds: 6,
        isPremium: false
    },
    {
        id: '2-4',
        chapter: 2,
        number: 10,
        title: 'Primeras Palabras',
        description: 'Usa las letras aprendidas para formar palabras reales.',
        objectives: [
            'Formar palabras con letras conocidas',
            'Practicar fluidez',
            'Conectar letras en contexto'
        ],
        letters: ['m', 'a', 'p', 's', 'o', 'l', 'r', 'n'],
        words: ['mama', 'papa', 'sol', 'sal', 'mar', 'pan', 'oso', 'ama'],
        gameType: 'words',
        rounds: 8,
        isPremium: false
    },

    // ==================== CAPÍTULO 3: FAMILIAS BRAILLE (GRATIS) ====================
    {
        id: '3-1',
        chapter: 3,
        number: 11,
        title: 'Familia a-b-c',
        description: 'Las letras a, b, c comparten patrones en la parte superior.',
        objectives: [
            'Aprender a (punto 1)',
            'Aprender b (puntos 1, 2)',
            'Aprender c (puntos 1, 4)'
        ],
        letters: ['a', 'b', 'c'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '3-2',
        chapter: 3,
        number: 12,
        title: 'Reconoce a-b-c',
        description: 'Identifica rápidamente a, b y c.',
        objectives: [
            'Reconocimiento rápido',
            'Distinguir patrones similares'
        ],
        letters: ['a', 'b', 'c'],
        gameType: 'pick',
        rounds: 9,
        isPremium: false
    },
    {
        id: '3-3',
        chapter: 3,
        number: 13,
        title: 'Familia d-e-f',
        description: 'Las letras d, e, f añaden puntos al patrón base.',
        objectives: [
            'Aprender d (puntos 1, 4, 5)',
            'Aprender e (puntos 1, 5)',
            'Aprender f (puntos 1, 2, 4)'
        ],
        letters: ['d', 'e', 'f'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '3-4',
        chapter: 3,
        number: 14,
        title: 'Reconoce d-e-f',
        description: 'Identifica rápidamente d, e y f.',
        objectives: [
            'Reconocimiento rápido',
            'Distinguir d de e'
        ],
        letters: ['d', 'e', 'f'],
        gameType: 'pick',
        rounds: 9,
        isPremium: false
    },
    {
        id: '3-5',
        chapter: 3,
        number: 15,
        title: 'Familia g-h-i-j',
        description: 'Las letras g, h, i, j. Atención al contraste entre i y j.',
        objectives: [
            'Aprender g, h, i, j',
            'Notar la diferencia entre i (2,4) y j (2,4,5)',
            'Evitar confusiones comunes'
        ],
        letters: ['g', 'h', 'i', 'j'],
        gameType: 'build',
        rounds: 12,
        isPremium: false
    },
    {
        id: '3-6',
        chapter: 3,
        number: 16,
        title: 'Contraste i vs j',
        description: 'Practica distinguir i de j - una confusión muy común.',
        objectives: [
            'Distinguir i (puntos 2, 4) de j (puntos 2, 4, 5)',
            'Desarrollar precisión'
        ],
        letters: ['i', 'j'],
        gameType: 'pick',
        rounds: 10,
        isPremium: false
    },

    // ==================== CAPÍTULO 4: EXPANSIÓN ALFABETO (GRATIS) ====================
    {
        id: '4-1',
        chapter: 4,
        number: 17,
        title: 'Letras k, l, m',
        description: 'Estas letras añaden el punto 3 al patrón.',
        objectives: [
            'Aprender k (puntos 1, 3)',
            'Reforzar l (puntos 1, 2, 3)',
            'Reforzar m (puntos 1, 3, 4)'
        ],
        letters: ['k', 'l', 'm'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '4-2',
        chapter: 4,
        number: 18,
        title: 'Letras n, o, p',
        description: 'Continúa expandiendo tu vocabulario Braille.',
        objectives: [
            'Reforzar n (puntos 1, 3, 4, 5)',
            'Reforzar o (puntos 1, 3, 5)',
            'Reforzar p (puntos 1, 2, 3, 4)'
        ],
        letters: ['n', 'o', 'p'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '4-3',
        chapter: 4,
        number: 19,
        title: 'Reconoce k-p',
        description: 'Reconocimiento rápido de k a p.',
        objectives: [
            'Reconocer patrones de k a p',
            'Mejorar velocidad'
        ],
        letters: ['k', 'l', 'm', 'n', 'o', 'p'],
        gameType: 'pick',
        rounds: 12,
        isPremium: false
    },
    {
        id: '4-4',
        chapter: 4,
        number: 20,
        title: 'Letras q, r, s, t',
        description: 'Cuatro letras más para completar tu progreso.',
        objectives: [
            'Aprender q (puntos 1, 2, 3, 4, 5)',
            'Reforzar r, s, t',
            '¡Ya vas por la mitad del alfabeto!'
        ],
        letters: ['q', 'r', 's', 't'],
        gameType: 'build',
        rounds: 12,
        isPremium: false
    },
    {
        id: '4-5',
        chapter: 4,
        number: 21,
        title: 'Reconoce a-t',
        description: 'Domina las primeras 20 letras.',
        objectives: [
            'Reconocer de a hasta t',
            'Reto de velocidad'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
        gameType: 'pick',
        rounds: 15,
        isPremium: false
    },

    // ==================== CAPÍTULO 5: ALFABETO COMPLETO + Ñ (GRATIS) ====================
    {
        id: '5-1',
        chapter: 5,
        number: 22,
        title: 'Letras u, v, w',
        description: 'Estas letras usan el punto 6.',
        objectives: [
            'Aprender u (puntos 1, 3, 6)',
            'Aprender v (puntos 1, 2, 3, 6)',
            'Aprender w (puntos 2, 4, 5, 6)'
        ],
        letters: ['u', 'v', 'w'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '5-2',
        chapter: 5,
        number: 23,
        title: 'Letras x, y, z',
        description: 'Las últimas letras del alfabeto base.',
        objectives: [
            'Aprender x (puntos 1, 3, 4, 6)',
            'Aprender y (puntos 1, 3, 4, 5, 6)',
            'Aprender z (puntos 1, 3, 5, 6)'
        ],
        letters: ['x', 'y', 'z'],
        gameType: 'build',
        rounds: 9,
        isPremium: false
    },
    {
        id: '5-3',
        chapter: 5,
        number: 24,
        title: 'La Letra Ñ',
        description: 'La ñ es única del español - muy importante.',
        objectives: [
            'Aprender ñ (puntos 1, 2, 4, 5, 6)',
            'Distinguir ñ de n',
            'Practicar en contexto'
        ],
        letters: ['ñ', 'n'],
        gameType: 'build',
        rounds: 8,
        isPremium: false
    },
    {
        id: '5-4',
        chapter: 5,
        number: 25,
        title: 'Alfabeto Completo',
        description: 'Construye cualquier letra de a-z más ñ.',
        objectives: [
            'Dominio completo del alfabeto',
            'Práctica aleatoria',
            '¡Felicidades!'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'build',
        rounds: 20,
        isPremium: false
    },
    {
        id: '5-5',
        chapter: 5,
        number: 26,
        title: 'Reconoce a-z-ñ',
        description: 'Identifica cualquier letra al instante.',
        objectives: [
            'Reconocimiento instantáneo',
            'Reto de velocidad',
            'Demuestra tu dominio'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'pick',
        rounds: 20,
        isPremium: false
    },

    // ==================== CAPÍTULO 6: FLUIDEZ (GRATIS) ====================
    {
        id: '6-1',
        chapter: 6,
        number: 27,
        title: 'Palabras Mixtas',
        description: 'Forma palabras usando todo el alfabeto.',
        objectives: [
            'Aplicar conocimiento en contexto',
            'Ganar fluidez',
            'Prepararse para lectura real'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u'],
        words: ['amor', 'mesa', 'silla', 'libro', 'perro', 'gato', 'casa', 'flor'],
        gameType: 'words',
        rounds: 8,
        isPremium: false
    },
    {
        id: '6-2',
        chapter: 6,
        number: 28,
        title: 'Frases Cortas',
        description: 'Construye frases simples palabra por palabra.',
        objectives: [
            'Leer frases en Braille',
            'Entender espaciado',
            'Fluidez real'
        ],
        letters: ['a', 'e', 'i', 'o', 'u', 'l', 'm', 'p', 's', 'n'],
        words: ['el sol', 'la mar', 'mi oso', 'su pan'],
        gameType: 'words',
        rounds: 4,
        isPremium: false
    },

    // ==================== CAPÍTULO 7: MAESTRÍA (PREMIUM) ====================
    {
        id: '7-1',
        chapter: 7,
        number: 29,
        title: 'Reto de Velocidad',
        description: 'Construye 20 letras en 90 segundos.',
        objectives: [
            'Velocidad máxima',
            'Sin tiempo para dudar',
            'Memoria muscular'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
        gameType: 'build',
        rounds: 20,
        timeLimit: 90,
        isPremium: true
    },
    {
        id: '7-2',
        chapter: 7,
        number: 30,
        title: 'Reconocimiento Experto',
        description: 'Identificación a toda velocidad.',
        objectives: [
            'Nivel experto',
            'Sin errores permitidos',
            'Verdadera maestría'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'pick',
        rounds: 20,
        isPremium: true
    },
    {
        id: '7-3',
        chapter: 7,
        number: 31,
        title: 'Maestro del Braille',
        description: 'El reto definitivo - sin pistas.',
        objectives: [
            'Dominio completo',
            '27 letras, sin pistas',
            'Conviértete en Maestro'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'build',
        rounds: 27,
        hintsDisabled: true,
        isPremium: true
    },

    // ==================== CAPÍTULO 8: MAYÚSCULAS (PREMIUM) ====================
    {
        id: '8-1',
        chapter: 8,
        number: 32,
        title: 'Signo de Mayúscula',
        description: 'El signo de mayúscula (puntos 4, 6) precede a la letra.',
        objectives: [
            'Aprender el signo de mayúscula',
            'Entender estructura de 2 celdas',
            'Observar ejemplos'
        ],
        letters: [],
        gameType: 'observe',
        rounds: 1,
        isPremium: true
    },
    {
        id: '8-2',
        chapter: 8,
        number: 33,
        title: 'Construye A-J Mayúsculas',
        description: 'Practica las primeras 10 letras mayúsculas.',
        objectives: [
            'Construir mayúsculas A-J',
            'Signo + letra',
            'Precisión en 2 celdas'
        ],
        letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
        gameType: 'build',
        rounds: 10,
        isPremium: true
    },
    {
        id: '8-3',
        chapter: 8,
        number: 34,
        title: 'Reconoce Mayúsculas',
        description: 'Identifica letras mayúsculas rápidamente.',
        objectives: [
            'Reconocer mayúsculas',
            'Distinguir de minúsculas'
        ],
        letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
        gameType: 'pick',
        rounds: 10,
        isPremium: true
    },
    {
        id: '8-4',
        chapter: 8,
        number: 35,
        title: 'Nombres Propios',
        description: 'Escribe nombres y siglas en Braille.',
        objectives: [
            'Escribir nombres propios',
            'Practicar con siglas',
            'Uso real de mayúsculas'
        ],
        letters: ['A', 'B', 'C', 'D', 'E', 'a', 'n', 'a', 'l', 'u', 'i', 's'],
        words: ['Ana', 'Luis', 'Eva'],
        gameType: 'words',
        rounds: 3,
        isPremium: true
    },

    // ==================== CAPÍTULO 9: NÚMEROS (PREMIUM) ====================
    {
        id: '9-1',
        chapter: 9,
        number: 36,
        title: 'Signo Numérico',
        description: 'El signo numérico (puntos 3, 4, 5, 6) convierte letras en números.',
        objectives: [
            'Aprender el signo numérico',
            'Entender la relación letra-número',
            'Observar ejemplos'
        ],
        letters: [],
        gameType: 'observe',
        rounds: 1,
        isPremium: true
    },
    {
        id: '9-2',
        chapter: 9,
        number: 37,
        title: 'Números 1-5',
        description: 'Los números 1-5 corresponden a las letras a-e.',
        objectives: [
            'Aprender 1 = a, 2 = b, etc.',
            'Construir con signo numérico',
            'Practicar estructura 2 celdas'
        ],
        letters: ['1', '2', '3', '4', '5'],
        gameType: 'build',
        rounds: 10,
        isPremium: true
    },
    {
        id: '9-3',
        chapter: 9,
        number: 38,
        title: 'Números 6-0',
        description: 'Los números 6-0 corresponden a las letras f-j.',
        objectives: [
            'Aprender 6 = f, 7 = g, etc.',
            'Dominar todos los dígitos',
            'Cero = j'
        ],
        letters: ['6', '7', '8', '9', '0'],
        gameType: 'build',
        rounds: 10,
        isPremium: true
    },
    {
        id: '9-4',
        chapter: 9,
        number: 39,
        title: 'Reconoce Números',
        description: 'Identifica cualquier número rápidamente.',
        objectives: [
            'Reconocimiento de números',
            'Velocidad'
        ],
        letters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        gameType: 'pick',
        rounds: 10,
        isPremium: true
    },
    {
        id: '9-5',
        chapter: 9,
        number: 40,
        title: 'Números en Frases',
        description: 'Usa números en contexto real.',
        objectives: [
            'Combinar texto y números',
            'Fechas, edades, cantidades'
        ],
        letters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        words: ['123', '2026', '15', '30'],
        gameType: 'words',
        rounds: 4,
        isPremium: true
    },

    // ==================== CAPÍTULO 10: PUNTUACIÓN (PREMIUM) ====================
    {
        id: '10-1',
        chapter: 10,
        number: 41,
        title: 'Punto, Coma, Punto y Coma',
        description: 'Los signos de puntuación básicos.',
        objectives: [
            'Punto (punto 3)',
            'Coma (punto 2)',
            'Punto y coma (puntos 2, 3)'
        ],
        letters: ['.', ',', ';'],
        gameType: 'build',
        rounds: 9,
        isPremium: true
    },
    {
        id: '10-2',
        chapter: 10,
        number: 42,
        title: 'Dos Puntos',
        description: 'Los dos puntos en Braille.',
        objectives: [
            'Dos puntos (puntos 2, 5)',
            'Uso en contexto'
        ],
        letters: [':'],
        gameType: 'build',
        rounds: 3,
        isPremium: true
    },
    {
        id: '10-3',
        chapter: 10,
        number: 43,
        title: 'Signos de Interrogación',
        description: '¿? en Braille español se usa al inicio y al final.',
        objectives: [
            '¿ y ? (puntos 2, 6)',
            'Mismo símbolo abre y cierra'
        ],
        letters: ['¿', '?'],
        gameType: 'build',
        rounds: 6,
        isPremium: true
    },
    {
        id: '10-4',
        chapter: 10,
        number: 44,
        title: 'Signos de Exclamación',
        description: '¡! en Braille español.',
        objectives: [
            '¡ y ! (puntos 2, 3, 5)',
            'Mismo símbolo abre y cierra'
        ],
        letters: ['¡', '!'],
        gameType: 'build',
        rounds: 6,
        isPremium: true
    },
    {
        id: '10-5',
        chapter: 10,
        number: 45,
        title: 'Guión, Comillas, Apóstrofo',
        description: 'Más signos de puntuación.',
        objectives: [
            'Guión (puntos 3, 6)',
            'Comillas (puntos 2, 3, 6)',
            'Apóstrofo (punto 4)'
        ],
        letters: ['-', '"', "'"],
        gameType: 'build',
        rounds: 9,
        isPremium: true
    },
    {
        id: '10-6',
        chapter: 10,
        number: 46,
        title: 'Frases con Puntuación',
        description: 'Usa puntuación en contexto.',
        objectives: [
            'Aplicar puntuación',
            'Fluidez real'
        ],
        letters: ['.', ',', '?', '!', 'a', 'e', 'i', 'o', 'u', 's', 'l'],
        words: ['¿si?', '¡hola!', 'el sol.'],
        gameType: 'words',
        rounds: 3,
        isPremium: true
    },
    {
        id: '10-7',
        chapter: 10,
        number: 47,
        title: 'Reconoce Puntuación',
        description: 'Identifica signos de puntuación.',
        objectives: [
            'Reconocimiento rápido',
            'Distinguir signos similares'
        ],
        letters: ['.', ',', ';', ':', '?', '!', '-', '"', "'"],
        gameType: 'pick',
        rounds: 12,
        isPremium: true
    },

    // ==================== CAPÍTULO 11: VOCALES CON TILDE (PREMIUM) ====================
    {
        id: '11-1',
        chapter: 11,
        number: 48,
        title: 'Concepto de Tildes',
        description: 'Las vocales acentuadas tienen sus propios patrones - 1 celda cada una.',
        objectives: [
            'Entender tildes en Braille',
            'Observar patrones únicos',
            'NO son 2 celdas'
        ],
        letters: [],
        gameType: 'observe',
        rounds: 1,
        isPremium: true
    },
    {
        id: '11-2',
        chapter: 11,
        number: 49,
        title: 'Construye á, é, í',
        description: 'Las primeras tres vocales acentuadas.',
        objectives: [
            'á (puntos 1, 2, 3, 5, 6)',
            'é (puntos 2, 3, 4, 6)',
            'í (puntos 3, 4)'
        ],
        letters: ['á', 'é', 'í'],
        gameType: 'build',
        rounds: 9,
        isPremium: true
    },
    {
        id: '11-3',
        chapter: 11,
        number: 50,
        title: 'Construye ó, ú',
        description: 'Completa las vocales acentuadas.',
        objectives: [
            'ó (puntos 3, 4, 6)',
            'ú (puntos 2, 3, 4, 5, 6)'
        ],
        letters: ['ó', 'ú'],
        gameType: 'build',
        rounds: 6,
        isPremium: true
    },
    {
        id: '11-4',
        chapter: 11,
        number: 51,
        title: 'Compara Tildes',
        description: 'Distingue vocales con y sin tilde.',
        objectives: [
            'a vs á, e vs é, etc.',
            'Precisión crítica'
        ],
        letters: ['a', 'á', 'e', 'é', 'i', 'í', 'o', 'ó', 'u', 'ú'],
        gameType: 'pick',
        rounds: 15,
        isPremium: true
    },
    {
        id: '11-5',
        chapter: 11,
        number: 52,
        title: 'Palabras con Tilde',
        description: 'Usa tildes en palabras reales.',
        objectives: [
            'Aplicar en contexto',
            'Ortografía correcta'
        ],
        letters: ['m', 'a', 'á', 'p', 'c', 'f', 'é', 'q', 'u', 'í', 's', 'l', 'ó', 'n', 'ú'],
        words: ['mamá', 'papá', 'café', 'aquí', 'salió', 'menú'],
        gameType: 'words',
        rounds: 6,
        isPremium: true
    },

    // ==================== CAPÍTULO 12: DIÉRESIS Ü (PREMIUM) ====================
    {
        id: '12-1',
        chapter: 12,
        number: 53,
        title: 'La Diéresis ü',
        description: 'La ü (puntos 1, 2, 5, 6) se usa en palabras como pingüino.',
        objectives: [
            'Aprender ü',
            'Entender su uso',
            'Practicar ejemplos'
        ],
        letters: ['ü'],
        gameType: 'observe',
        rounds: 1,
        isPremium: true
    },
    {
        id: '12-2',
        chapter: 12,
        number: 54,
        title: 'Construye ü',
        description: 'Practica la diéresis.',
        objectives: [
            'ü (puntos 1, 2, 5, 6)',
            'Memoria muscular'
        ],
        letters: ['ü'],
        gameType: 'build',
        rounds: 5,
        isPremium: true
    },
    {
        id: '12-3',
        chapter: 12,
        number: 55,
        title: 'Palabras con ü',
        description: 'Usa la diéresis en palabras reales.',
        objectives: [
            'pingüino, vergüenza, bilingüe',
            'Aplicación real'
        ],
        letters: ['p', 'i', 'n', 'g', 'ü', 'o', 'v', 'e', 'r', 'z', 'a', 'b', 'l'],
        words: ['pingüino', 'vergüenza', 'bilingüe'],
        gameType: 'words',
        rounds: 3,
        isPremium: true
    },

    // ==================== CAPÍTULO 13: SIGNOS MATEMÁTICOS Y DIGITALES (PREMIUM) ====================
    {
        id: '13-1',
        chapter: 13,
        number: 56,
        title: 'Signos Matemáticos Básicos',
        description: 'Suma, resta, multiplicación, división, igual.',
        objectives: [
            '+ (puntos 2, 3, 5)',
            '− (puntos 3, 6)',
            '× (puntos 1, 6)',
            '÷ (puntos 3, 4)',
            '= (puntos 2, 3, 5, 6)'
        ],
        letters: ['+', '−', '×', '÷', '='],
        gameType: 'build',
        rounds: 10,
        isPremium: true
    },
    {
        id: '13-2',
        chapter: 13,
        number: 57,
        title: 'Operaciones Simples',
        description: 'Escribe operaciones matemáticas simples.',
        objectives: [
            '2+2=4',
            '5-3=2',
            'Práctica real'
        ],
        letters: ['1', '2', '3', '4', '5', '+', '−', '='],
        words: ['2+2=4', '5-3=2'],
        gameType: 'words',
        rounds: 2,
        isPremium: true
    },
    {
        id: '13-3',
        chapter: 13,
        number: 58,
        title: 'Signos Digitales',
        description: 'Símbolos para email, porcentaje, arroba.',
        objectives: [
            '@ (punto 5)',
            '% (puntos 3, 4, 6)',
            'Uso en emails y URLs'
        ],
        letters: ['@', '%'],
        gameType: 'build',
        rounds: 6,
        isPremium: true
    },
    {
        id: '13-4',
        chapter: 13,
        number: 59,
        title: 'Emails y URLs',
        description: 'Practica escribiendo direcciones digitales.',
        objectives: [
            'Escribir emails simples',
            'Entender formato digital'
        ],
        letters: ['a', 'b', 'c', '@', '.', 'c', 'o', 'm'],
        words: ['a@b.com'],
        gameType: 'words',
        rounds: 1,
        isPremium: true
    }
];

// ================================
// ACHIEVEMENTS (SPANISH)
// ================================

const ACHIEVEMENTS = [
    {
        id: 'first_letter',
        title: 'Primeros Pasos',
        description: 'Construye tu primera letra Braille',
        icon: '🎯',
        type: 'milestone',
        threshold: 1,
        xpReward: 50
    },
    {
        id: 'streak_3',
        title: 'En Racha',
        description: 'Practica 3 días seguidos',
        icon: '🔥',
        type: 'streak',
        threshold: 3,
        xpReward: 100
    },
    {
        id: 'streak_7',
        title: 'Guerrero de la Semana',
        description: 'Practica 7 días seguidos',
        icon: '💪',
        type: 'streak',
        threshold: 7,
        xpReward: 250
    },
    {
        id: 'perfect_10',
        title: 'Perfecto 10',
        description: 'Obtén 100% de precisión en un nivel',
        icon: '⭐',
        type: 'accuracy',
        threshold: 100,
        xpReward: 150
    },
    {
        id: 'level_5',
        title: 'Aprendiz Rápido',
        description: 'Completa 5 niveles',
        icon: '📚',
        type: 'milestone',
        threshold: 5,
        xpReward: 200
    },
    {
        id: 'vowel_master',
        title: 'Maestro de Vocales',
        description: 'Completa el Capítulo 1 (Vocales)',
        icon: '🅰️',
        type: 'content',
        threshold: 5,
        xpReward: 150
    },
    {
        id: 'alphabet_half',
        title: 'A Medio Camino',
        description: 'Completa el Capítulo 4',
        icon: '🎓',
        type: 'content',
        threshold: 13,
        xpReward: 300
    },
    {
        id: 'alphabet_master',
        title: 'Maestro del Alfabeto',
        description: 'Completa el Capítulo 5 (Alfabeto + Ñ)',
        icon: '🏆',
        type: 'content',
        threshold: 27,
        xpReward: 500
    },
    {
        id: 'accent_master',
        title: 'Maestro de Tildes',
        description: 'Completa el Capítulo 11',
        icon: '✨',
        type: 'content',
        threshold: 32,
        xpReward: 400
    }
];

// ================================
// DAILY CHALLENGE TEMPLATES
// ================================

const DAILY_CHALLENGE_TEMPLATES = [
    {
        type: 'build',
        title: 'Reto de Construcción',
        description: 'Construye 5 letras aleatorias',
        rounds: 5,
        xpReward: 50
    },
    {
        type: 'pick',
        title: 'Reto de Reconocimiento',
        description: 'Identifica 5 patrones Braille',
        rounds: 5,
        xpReward: 50
    },
    {
        type: 'mixed',
        title: 'Reto Mixto',
        description: 'Construye e identifica letras',
        rounds: 6,
        xpReward: 75
    }
];

// ================================
// HELPER FUNCTIONS
// ================================

// Helper function to get dots description for a letter (Spanish)
function getDotsDescription(char) {
    let dots;
    let prefixDescription = '';

    if (/[A-Z]/.test(char)) {
        prefixDescription = 'Signo de mayúscula (puntos 4 y 6) seguido de ';
        dots = BRAILLE_ALPHABET[char.toLowerCase()];
    } else if (/[0-9]/.test(char)) {
        prefixDescription = 'Signo de número (puntos 3, 4, 5 y 6) seguido de ';
        dots = BRAILLE_NUMBERS[char];
    } else if (BRAILLE_ACCENTS[char]) {
        dots = BRAILLE_ACCENTS[char];
    } else if (BRAILLE_SYMBOLS[char]) {
        dots = BRAILLE_SYMBOLS[char];
    } else if (BRAILLE_MATH[char]) {
        dots = BRAILLE_MATH[char];
    } else if (BRAILLE_DIGITAL[char]) {
        dots = BRAILLE_DIGITAL[char];
    } else {
        dots = BRAILLE_ALPHABET[char.toLowerCase()];
    }

    if (!dots) return 'desconocido';

    let dotsText = '';
    if (dots.length === 1) {
        dotsText = `punto ${dots[0]}`;
    } else {
        const lastDot = dots[dots.length - 1];
        const otherDots = dots.slice(0, -1).join(', ');
        dotsText = `puntos ${otherDots} y ${lastDot}`;
    }

    return prefixDescription + dotsText;
}

// Helper to compare dot arrays
function dotsMatch(userDots, correctDots) {
    if (userDots.length !== correctDots.length) return false;
    const sortedUser = [...userDots].sort((a, b) => a - b);
    const sortedCorrect = [...correctDots].sort((a, b) => a - b);
    return sortedUser.every((dot, i) => dot === sortedCorrect[i]);
}

// Resolve any supported character into its Braille dot pattern
function resolveDots(char) {
    if (!char) return null;
    if (/[A-Z]/.test(char)) return BRAILLE_ALPHABET[char.toLowerCase()];
    if (/[0-9]/.test(char)) return BRAILLE_NUMBERS[char];
    if (BRAILLE_ACCENTS[char]) return BRAILLE_ACCENTS[char];
    if (BRAILLE_MATH[char]) return BRAILLE_MATH[char];
    if (BRAILLE_DIGITAL[char]) return BRAILLE_DIGITAL[char];
    return BRAILLE_SYMBOLS[char] || BRAILLE_ALPHABET[char.toLowerCase()] || null;
}

// Generate distractors for pick game (similar but incorrect patterns)
function generateDistractors(correctLetter, count = 3, availableLetters = null) {
    const correct = resolveDots(correctLetter);
    if (!correct) return [];

    // Combine all possible letters for distractors
    const allLetters = [
        ...Object.keys(BRAILLE_ALPHABET),
        ...Object.keys(BRAILLE_ACCENTS)
    ];

    const letters = (availableLetters || allLetters).filter(Boolean);

    // Define common confusion pairs for intelligent distractors
    const confusionPairs = {
        'i': ['j', 'e'],
        'j': ['i', 'g'],
        'e': ['i', 'a'],
        'n': ['ñ', 'm'],
        'ñ': ['n', 'g'],
        'a': ['á', 'e'],
        'á': ['a', 'é'],
        'é': ['e', 'í'],
        'í': ['i', 'ó'],
        'ó': ['o', 'ú'],
        'ú': ['u', 'ó']
    };

    // Score letters by similarity to correct answer
    const scored = letters
        .filter(l => l !== correctLetter)
        .map(letter => {
            const dots = resolveDots(letter);
            if (!dots) return null;

            // Calculate similarity (shared dots)
            const shared = dots.filter(d => correct.includes(d)).length;
            const totalDiff = Math.abs(dots.length - correct.length);

            // Bonus for known confusion pairs
            let confusionBonus = 0;
            if (confusionPairs[correctLetter] && confusionPairs[correctLetter].includes(letter)) {
                confusionBonus = 3;
            }

            return { letter, similarity: shared - totalDiff + confusionBonus };
        })
        .filter(Boolean)
        .sort((a, b) => b.similarity - a.similarity);

    // Pick top similar letters as distractors
    return scored.slice(0, count).map(s => s.letter);
}

// ================================
// EXPORT
// ================================

window.BrailleData = {
    BRAILLE_ALPHABET,
    BRAILLE_ACCENTS,
    SPECIAL_SIGNS,
    BRAILLE_NUMBERS,
    BRAILLE_SYMBOLS,
    BRAILLE_MATH,
    BRAILLE_DIGITAL,
    DOT_POSITIONS,
    WORD_CORPUS,
    LEVELS,
    ACHIEVEMENTS,
    DAILY_CHALLENGE_TEMPLATES,
    getDotsDescription,
    dotsMatch,
    resolveDots,
    generateDistractors
};
