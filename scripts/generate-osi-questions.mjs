// Genera un lote nuevo de preguntas tipo test sobre el modelo OSI / TCP-IP
// usando la API de Groq (gratuita, sin tarjeta). Pensado para correr desde
// un GitHub Action programado, nunca desde el navegador — la API key
// nunca llega al HTML público.
//
// Uso local (para probar antes de subirlo):
//   GROQ_API_KEY=tu_key node scripts/generate-osi-questions.mjs

import fs from 'node:fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const N_QUESTIONS = 15;

if (!GROQ_API_KEY) {
  console.error('Falta la variable de entorno GROQ_API_KEY.');
  process.exit(1);
}

const SYSTEM_PROMPT = `Eres un generador de preguntas tipo test sobre el modelo OSI y TCP/IP,
pensado para practicar de cara a certificaciones de ciberseguridad (nivel IFCT0109 / SOC Junior).

Genera EXACTAMENTE ${N_QUESTIONS} preguntas de opción múltiple en español, variadas en dificultad
(fácil, media, difícil) y en tema: capas OSI, PDU por capa, protocolos, puertos comunes, dispositivos
de red, encapsulación/desencapsulación, TCP vs UDP, y el mapeo entre OSI (7 capas) y TCP/IP (4 capas).

No repitas la misma pregunta con distinta redacción. Las 4 opciones de cada pregunta deben ser
plausibles y sin ambigüedad (solo una puede ser correcta).

Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después, con este formato exacto:
{"questions":[{"q":"texto de la pregunta","opts":["opción A","opción B","opción C","opción D"],"correct":0,"exp":"explicación breve de 1-2 frases de por qué esa es la respuesta correcta"}]}

El campo "correct" es el índice (0,1,2 o 3) de la opción correcta dentro de "opts".`;

async function main() {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Genera el lote de preguntas de hoy.' },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Error de la API de Groq (HTTP ${res.status}):`, errText);
    process.exit(1);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error('Respuesta inesperada de Groq (sin contenido):', JSON.stringify(data));
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('El modelo no devolvió JSON válido:', content);
    process.exit(1);
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    console.error('El JSON no trae un array "questions" válido:', parsed);
    process.exit(1);
  }

  // Validación mínima de forma, para no publicar un JSON roto en la web pública
  const clean = parsed.questions.filter(q =>
    typeof q.q === 'string' &&
    Array.isArray(q.opts) && q.opts.length === 4 &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3 &&
    typeof q.exp === 'string'
  );

  if (clean.length === 0) {
    console.error('Ninguna pregunta pasó la validación de formato.');
    process.exit(1);
  }

  const output = {
    generated_at: new Date().toISOString(),
    source: `groq/${MODEL}`,
    questions: clean,
  };

  fs.mkdirSync('questions', { recursive: true });
  fs.writeFileSync('questions/osi-quiz.json', JSON.stringify(output, null, 2));
  console.log(`OK — ${clean.length} preguntas nuevas escritas en questions/osi-quiz.json`);
}

main().catch(err => {
  console.error('Fallo inesperado:', err);
  process.exit(1);
});
