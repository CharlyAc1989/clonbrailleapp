/**
 * Braille Quest - Braille Data and Content (Spanish Version)
 * Contains all Braille alphabet mappings, levels, and achievements
 */

// Standard 6-dot Braille cell layout:
// [1] [4]
// [2] [5]
// [3] [6]

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

const BRAILLE_SYMBOLS = {
    '.': [2, 5, 6],           // Punto
    ',': [2],                 // Coma
    '?': [2, 6],              // Signo de interrogación
    '¿': [2, 6],              // Signo de interrogación de apertura
    '!': [2, 3, 5],           // Signo de exclamación
    '¡': [2, 3, 5],           // Signo de exclamación de apertura
    ':': [2, 5],              // Dos puntos
    ';': [2, 3],              // Punto y coma
    "'": [4],                 // Apóstrofo
    '-': [3, 6],              // Guión
    '(': [1, 2, 6],           // Paréntesis de apertura
    ')': [3, 4, 5]            // Paréntesis de cierre
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


// Level definitions - Full curriculum covering A-Z (Spanish)
const LEVELS = [

    // ==================== CAPÍTULO 1: LOS FUNDAMENTOS ====================
    {
        id: '1-1',
        chapter: 1,
        number: 1,
        title: 'Conoce la Celda Braille',
        description: 'Una celda Braille tiene 6 puntos ordenados en 2 columnas. Los puntos 1, 2, 3 están a la izquierda. Los puntos 4, 5, 6 están a la derecha.',
        objectives: [
            'Entender la celda Braille de 6 puntos',
            'Aprender las letras a, b y c',
            'Practicar la construcción de patrones Braille'
        ],
        letters: ['a', 'b', 'c'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 0,
        isPremium: false
    },
    {
        id: '1-2',
        chapter: 1,
        number: 2,
        title: 'Reconoce a, b, c',
        description: 'Practica reconociendo las primeras tres letras del alfabeto en Braille.',
        objectives: [
            'Reconocer patrones de a, b, c',
            'Elegir celdas Braille correctas',
            'Mejorar velocidad y precisión'
        ],
        letters: ['a', 'b', 'c'],
        gameType: 'pick',
        rounds: 10,
        requiredXP: 100,
        isPremium: false
    },
    {
        id: '1-3',
        chapter: 1,
        number: 3,
        title: 'Letras d, e, f',
        description: 'Amplía tu conocimiento con tres letras más.',
        objectives: [
            'Aprender las letras d, e y f',
            'Dominar nuevos patrones de puntos',
            'Repasar a, b, c'
        ],
        letters: ['d', 'e', 'f'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 200,
        isPremium: false
    },
    {
        id: '1-4',
        chapter: 1,
        number: 4,
        title: 'Practica a-f',
        description: 'Repasa y reconoce las seis letras aprendidas hasta ahora.',
        objectives: [
            'Repasar de a hasta f',
            'Reconocimiento rápido de patrones',
            'Desarrollar memoria muscular'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f'],
        gameType: 'pick',
        rounds: 12,
        requiredXP: 300,
        isPremium: false
    },

    // ==================== CAPÍTULO 2: VOCALES Y MÁS ====================
    {
        id: '2-1',
        chapter: 2,
        number: 5,
        title: 'Las Vocales',
        description: 'Domina las cinco vocales en Braille - la base de la lectura.',
        objectives: [
            'Aprender las 5 vocales: a, e, i, o, u',
            'Entender los patrones de vocales',
            'Ganar confianza'
        ],
        letters: ['a', 'e', 'i', 'o', 'u'],
        gameType: 'build',
        rounds: 15,
        requiredXP: 400,
        isPremium: false
    },
    {
        id: '2-2',
        chapter: 2,
        number: 6,
        title: 'Reconocimiento de Vocales',
        description: 'Reto de velocidad con todas las vocales.',
        objectives: [
            'Reconocimiento rápido de vocales',
            'Mejorar tiempo de reacción',
            'Perfeccionar tu precisión'
        ],
        letters: ['a', 'e', 'i', 'o', 'u'],
        gameType: 'pick',
        rounds: 15,
        requiredXP: 500,
        isPremium: false
    },
    {
        id: '2-3',
        chapter: 2,
        number: 7,
        title: 'Letras g, h, i, j',
        description: 'Continúa por el alfabeto con cuatro nuevas letras.',
        objectives: [
            'Aprender patrones de g, h, i, j',
            'Notar similitudes entre letras',
            'Construir sobre conocimiento previo'
        ],
        letters: ['g', 'h', 'i', 'j'],
        gameType: 'build',
        rounds: 12,
        requiredXP: 600,
        isPremium: false
    },
    {
        id: '2-4',
        chapter: 2,
        number: 8,
        title: 'Repaso a-j',
        description: 'Repaso completo de las primeras 10 letras.',
        objectives: [
            'Dominar letras de a hasta j',
            'Desarrollar fluidez lectora',
            'Prepararse para el siguiente capítulo'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        gameType: 'pick',
        rounds: 15,
        requiredXP: 700,
        isPremium: false
    },

    // ==================== CAPÍTULO 3: CONSTRUYENDO PALABRAS ====================
    {
        id: '3-1',
        chapter: 3,
        number: 9,
        title: 'Letras k, l, m',
        description: 'Aprende tres consonantes importantes usadas en palabras comunes.',
        objectives: [
            'Dominar patrones de k, l, m',
            'Entender el uso del punto 3',
            'Practicar con precisión'
        ],
        letters: ['k', 'l', 'm'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 800,
        isPremium: false
    },
    {
        id: '3-2',
        chapter: 3,
        number: 10,
        title: 'Letras n, o, p',
        description: 'Continúa expandiendo tu conocimiento del alfabeto.',
        objectives: [
            'Aprender patrones de n, o, p',
            'Conectar con vocales aprendidas',
            'Construir bases para palabras'
        ],
        letters: ['n', 'o', 'p'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 900,
        isPremium: false
    },
    {
        id: '3-3',
        chapter: 3,
        number: 11,
        title: 'Practica k-p',
        description: 'Reconoce y distingue de k hasta p.',
        objectives: [
            'Reconocimiento rápido k-p',
            'Distinguir patrones similares',
            'Reto de velocidad'
        ],
        letters: ['k', 'l', 'm', 'n', 'o', 'p'],
        gameType: 'pick',
        rounds: 12,
        requiredXP: 1000,
        isPremium: false
    },
    {
        id: '3-4',
        chapter: 3,
        number: 12,
        title: 'Letras q, r, s, t',
        description: 'Cuatro letras más para completar tu vocabulario creciente.',
        objectives: [
            'Dominar q, r, s, t',
            'Aprender patrones complejos',
            '¡Ya vas por la mitad del alfabeto!'
        ],
        letters: ['q', 'r', 's', 't'],
        gameType: 'build',
        rounds: 12,
        requiredXP: 1100,
        isPremium: false
    },
    {
        id: '3-5',
        chapter: 3,
        number: 13,
        title: 'Repaso del Alfabeto a-t',
        description: 'Repaso completo de 20 letras.',
        objectives: [
            'Dominar de a hasta t',
            'Reconocimiento veloz',
            'Prepararse para las letras finales'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
        gameType: 'pick',
        rounds: 15,
        requiredXP: 1200,
        isPremium: false
    },

    // ==================== CAPÍTULO 4: ALFABETO COMPLETO ====================
    {
        id: '4-1',
        chapter: 4,
        number: 14,
        title: 'Letras u, v, w',
        description: 'Aprende las consonantes finales con patrones del punto 6.',
        objectives: [
            'Dominar patrones de u, v, w',
            'Entender el uso del punto 6',
            '¡Ya casi terminas!'
        ],
        letters: ['u', 'v', 'w'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 1300,
        isPremium: false
    },
    {
        id: '4-2',
        chapter: 4,
        number: 15,
        title: 'Letras x, y, z',
        description: 'Completa el alfabeto con las tres letras finales.',
        objectives: [
            'Dominar x, y, z',
            'Completar alfabeto completo',
            '¡Celebra tu logro!'
        ],
        letters: ['x', 'y', 'z'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 1400,
        isPremium: false
    },
    {
        id: '4-3',
        chapter: 4,
        number: 16,
        title: 'Construye el Alfabeto Completo',
        description: 'Construye cualquier letra de A a Z.',
        objectives: [
            'Dominio completo del alfabeto',
            'Práctica de letras aleatorias',
            'Pon a prueba tu conocimiento'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'build',
        rounds: 20,
        requiredXP: 1500,
        isPremium: false
    },
    {
        id: '4-4',
        chapter: 4,
        number: 17,
        title: 'Reconocimiento del Alfabeto Completo',
        description: 'Identifica cualquier letra Braille al instante.',
        objectives: [
            'Reconocimiento instantáneo de letras',
            'Reto de velocidad',
            'Demuestra tu dominio'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'pick',
        rounds: 20,
        requiredXP: 1600,
        isPremium: false
    },

    // ==================== CAPÍTULO 5: MAESTRÍA ====================
    {
        id: '5-1',
        chapter: 5,
        number: 18,
        title: 'Reto de Velocidad',
        description: 'Construye letras lo más rápido que puedas. Modo de reto premium.',
        objectives: [
            'Velocidad máxima',
            'Pon a prueba tus límites',
            'Supera tu mejor tiempo'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
        gameType: 'build',
        rounds: 15,
        requiredXP: 1800,
        isPremium: true
    },
    {
        id: '5-2',
        chapter: 5,
        number: 19,
        title: 'Reconocimiento Experto',
        description: 'Identificación de letras a toda velocidad para expertos.',
        objectives: [
            'Velocidad de nivel experto',
            'No se permiten errores',
            'Prueba de verdadera maestría'
        ],
        letters: ['n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'pick',
        rounds: 15,
        requiredXP: 2000,
        isPremium: true
    },
    {
        id: '5-3',
        chapter: 5,
        number: 20,
        title: 'Maestro del Braille',
        description: 'El reto definitivo - demuestra que eres un Maestro del Braille.',
        objectives: [
            'Dominio completo',
            '26 letras, sin pistas',
            'Conviértete en Maestro del Braille'
        ],
        letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        gameType: 'build',
        rounds: 26,
        requiredXP: 2500,
        isPremium: true
    },

    // ==================== CAPÍTULO 6: MAYÚSCULAS Y NÚMEROS ====================
    {
        id: '6-1',
        chapter: 6,
        number: 21,
        title: 'Signo de Mayúscula',
        description: 'En Braille, el punto 6 indica que la siguiente letra es mayúscula.',
        objectives: [
            'Aprender el signo de mayúscula (punto 6)',
            'Practicar letras mayúsculas',
            'Entender la estructura de dos celdas'
        ],
        letters: ['A', 'B', 'C', 'D', 'E'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 2800,
        isPremium: false
    },
    {
        id: '7-1',
        chapter: 7,
        number: 22,
        title: 'Introducción a los Números',
        description: 'El signo de número (3-4-5-6) convierte las letras A-J en números 1-0.',
        objectives: [
            'Aprender el signo de número',
            'Aprender números del 1 al 5',
            'Relacionar números con letras A-E'
        ],
        letters: ['1', '2', '3', '4', '5'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 3200,
        isPremium: false
    },
    {
        id: '7-2',
        chapter: 7,
        number: 23,
        title: 'Números del 6 al 0',
        description: 'Continúa practicando los números con el signo de número.',
        objectives: [
            'Aprender números del 6 al 0',
            'Dominar el signo de número',
            'Relacionar números con letras F-J'
        ],
        letters: ['6', '7', '8', '9', '0'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 3500,
        isPremium: false
    },
    {
        id: '8-1',
        chapter: 8,
        number: 24,
        title: 'Signos de Puntuación',
        description: 'Aprende los símbolos más comunes en Braille.',
        objectives: [
            'Aprender el Punto, Coma y Guion',
            'Aprender Signos de Interrogación y Exclamación',
            'Mejorar fluidez de lectura'
        ],
        letters: ['.', ',', '-', '?', '!'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 4000,
        isPremium: false
    },
    {
        id: '8-2',
        chapter: 8,
        number: 25,
        title: 'Más Signos de Puntuación',
        description: 'Continúa aprendiendo símbolos de puntuación en Braille.',
        objectives: [
            'Aprender Dos Puntos y Punto y Coma',
            'Aprender el Apóstrofo',
            'Aprender los Paréntesis'
        ],
        letters: [':', ';', "'", '(', ')'],
        gameType: 'build',
        rounds: 10,
        requiredXP: 4500,
        isPremium: false
    }
];

// Achievements (Spanish)
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
        description: 'Aprende las 5 vocales',
        icon: '🅰️',
        type: 'content',
        threshold: 5,
        xpReward: 150
    },
    {
        id: 'alphabet_half',
        title: 'A Medio Camino',
        description: 'Aprende 13 letras',
        icon: '🎓',
        type: 'content',
        threshold: 13,
        xpReward: 300
    },
    {
        id: 'alphabet_master',
        title: 'Maestro del Alfabeto',
        description: 'Aprende las 26 letras',
        icon: '🏆',
        type: 'content',
        threshold: 26,
        xpReward: 500
    }
];

// Daily challenge templates (Spanish)
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

// Helper function to get dots description for a letter (Spanish)
function getDotsDescription(char) {
    let dots;
    let prefixDescription = '';

    if (/[A-Z]/.test(char)) {
        prefixDescription = 'Signo de mayúscula (punto 6) seguido de ';
        dots = BRAILLE_ALPHABET[char.toLowerCase()];
    } else if (/[0-9]/.test(char)) {
        prefixDescription = 'Signo de número (puntos 3, 4, 5 y 6) seguido de ';
        dots = BRAILLE_NUMBERS[char];
    } else if (BRAILLE_SYMBOLS[char]) {
        dots = BRAILLE_SYMBOLS[char];
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

// Generate distractors for pick game (similar but incorrect patterns)
function generateDistractors(correctLetter, count = 3, availableLetters = null) {
    const correct = BRAILLE_ALPHABET[correctLetter];
    const letters = availableLetters || Object.keys(BRAILLE_ALPHABET);

    // Score letters by similarity to correct answer
    const scored = letters
        .filter(l => l !== correctLetter)
        .map(letter => {
            const dots = BRAILLE_ALPHABET[letter];
            // Calculate similarity (shared dots)
            const shared = dots.filter(d => correct.includes(d)).length;
            const totalDiff = Math.abs(dots.length - correct.length);
            return { letter, similarity: shared - totalDiff };
        })
        .sort((a, b) => b.similarity - a.similarity);

    // Pick top similar letters as distractors
    return scored.slice(0, count).map(s => s.letter);
}

// Export for use in app.js
window.BrailleData = {
    BRAILLE_ALPHABET,
    SPECIAL_SIGNS,
    BRAILLE_NUMBERS,
    BRAILLE_SYMBOLS,
    DOT_POSITIONS,
    LEVELS,
    ACHIEVEMENTS,
    DAILY_CHALLENGE_TEMPLATES,
    getDotsDescription,
    dotsMatch,
    generateDistractors
};
