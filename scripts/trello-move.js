/**
 * trello-move.js — mueve una tarjeta de Trello y deja un comentario.
 * Busca coincidencia parcial entre el título del PR/commit y el nombre de la tarjeta.
 *
 * Uso: node scripts/trello-move.js <LIST_ID> <TITULO> <URL> <COMENTARIO>
 */
const [,, listId, titulo, url, comentario] = process.argv;

const KEY   = process.env.TRELLO_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BOARD = process.env.TRELLO_BOARD_ID;

if (!KEY || !TOKEN || !BOARD || !listId) {
  console.log('⚠️  Variables de entorno incompletas. Saltando paso de Trello.');
  process.exit(0);
}

async function run() {
  try {
    const res = await fetch(
      `https://api.trello.com/1/boards/${BOARD}/cards?key=${KEY}&token=${TOKEN}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cards = await res.json();

    // Limpiar prefijo convencional (feat:, fix:, etc.) para buscar la tarjeta
    const termino = (titulo || '')
      .toLowerCase()
      .replace(/^(feat|fix|chore|docs|style|refactor|test|ci|cd)[:(]\s*/i, '')
      .trim()
      .slice(0, 50);

    const tarjeta = cards.find(c =>
      termino.includes(c.name.toLowerCase().slice(0, 30)) ||
      c.name.toLowerCase().includes(termino.slice(0, 30))
    );

    if (!tarjeta) {
      console.log(`ℹ️  No se encontró tarjeta que coincida con: "${titulo}". Saltando.`);
      process.exit(0);
    }

    // Mover a la lista destino
    await fetch(
      `https://api.trello.com/1/cards/${tarjeta.id}?key=${KEY}&token=${TOKEN}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idList: listId })
      }
    );

    // Comentar con timestamp en horario argentino
    const hora = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short'
    });
    await fetch(
      `https://api.trello.com/1/cards/${tarjeta.id}/actions/comments?key=${KEY}&token=${TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${comentario}\n🔗 ${url}\n⏰ ${hora} (ARG)` })
      }
    );

    console.log(`✅ Tarjeta "${tarjeta.name}" → lista ${listId}`);
  } catch (err) {
    console.error('Error con Trello:', err.message);
    process.exit(0); // No rompe el pipeline
  }
}

run();
