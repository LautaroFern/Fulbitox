import { Jugador, TeamAllocation } from './types';

export const DEFAULT_JUGADORES: Jugador[] = [
  { id: 'def-1', nombre: 'Dibu Martínez', posicion: 'arquero', nivel: 5 },
  { id: 'def-2', nombre: 'Franco Armani', posicion: 'arquero', nivel: 4 },
  { id: 'def-3', nombre: 'Cuti Romero', posicion: 'defensa', nivel: 5 },
  { id: 'def-4', nombre: 'Nicolás Otamendi', posicion: 'defensa', nivel: 4 },
  { id: 'def-5', nombre: 'Lisandro Martínez', posicion: 'defensa', nivel: 4 },
  { id: 'def-6', nombre: 'Marcos Acuña', posicion: 'defensa', nivel: 3 },
  { id: 'def-7', nombre: 'Rodrigo De Paul', posicion: 'mediocampista', nivel: 5 },
  { id: 'def-8', nombre: 'Enzo Fernández', posicion: 'mediocampista', nivel: 4 },
  { id: 'def-9', nombre: 'Alexis Mac Allister', posicion: 'mediocampista', nivel: 4 },
  { id: 'def-10', nombre: 'Leandro Paredes', posicion: 'mediocampista', nivel: 3 },
  { id: 'def-11', nombre: 'Gio Lo Celso', posicion: 'mediocampista', nivel: 4 },
  { id: 'def-12', nombre: 'Lionel Messi', posicion: 'delantero', nivel: 5 },
  { id: 'def-13', nombre: 'Ángel Di María', posicion: 'delantero', nivel: 5 },
  { id: 'def-14', nombre: 'Lautaro Martínez', posicion: 'delantero', nivel: 4 },
  { id: 'def-15', nombre: 'Julián Álvarez', posicion: 'delantero', nivel: 4 },
  { id: 'def-16', nombre: 'Alejandro Garnacho', posicion: 'delantero', nivel: 3 }
];

export const STORAGE_KEY = 'futbol7_jugadores';

export function loadJugadores(): Jugador[] {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val !== null) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading localStorage", e);
  }
  // Store default players initially
  saveJugadores(DEFAULT_JUGADORES);
  return DEFAULT_JUGADORES;
}

export function saveJugadores(jugadores: Jugador[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jugadores));
  } catch (e) {
    console.error("Error writing localStorage", e);
  }
}

export function balanceTeams(selectedPlayers: Jugador[]): TeamAllocation {
  // 1. Separate arqueros and others
  const arqueros = selectedPlayers.filter(p => p.posicion === 'arquero');
  const others = selectedPlayers.filter(p => p.posicion !== 'arquero');

  // Sort others by level descending, then by name
  others.sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre));

  const blancos: Jugador[] = [];
  const rojos: Jugador[] = [];
  const suplentes: Jugador[] = [];

  // Distribute arqueros: automatic balance - max 1 arquero per team
  if (arqueros.length >= 2) {
    blancos.push(arqueros[0]);
    rojos.push(arqueros[1]);
    // Extra arqueros are treated as normal players in the distribution pool
    for (let i = 2; i < arqueros.length; i++) {
      others.push(arqueros[i]);
    }
  } else if (arqueros.length === 1) {
    // If only 1 arquero, goes to whites default
    blancos.push(arqueros[0]);
  }

  // Re-sort others since we might have added extra arqueros
  others.sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre));

  // Distribute remaining players to fill teams of max 7 players
  for (const player of others) {
    if (blancos.length < 7 && rojos.length < 7) {
      // Balance by length first, then by combined skill level
      if (blancos.length < rojos.length) {
        blancos.push(player);
      } else if (rojos.length < blancos.length) {
        rojos.push(player);
      } else {
        // Equal length, send to the team with lower level sum
        const powerBlancos = blancos.reduce((sum, p) => sum + p.nivel, 0);
        const powerRojos = rojos.reduce((sum, p) => sum + p.nivel, 0);
        if (powerBlancos <= powerRojos) {
          blancos.push(player);
        } else {
          rojos.push(player);
        }
      }
    } else if (blancos.length < 7) {
      blancos.push(player);
    } else if (rojos.length < 7) {
      rojos.push(player);
    } else {
      suplentes.push(player);
    }
  }

  return { blancos, rojos, suplentes };
}

export function formatWhatsAppMessage(allocation: TeamAllocation): string {
  const getStars = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level);
  const getEmoji = (pos: string) => {
    switch (pos) {
      case 'arquero': return '🥅';
      case 'defensa': return '🛡️';
      case 'mediocampista': return '⚙️';
      case 'delantero': return '⚡';
      default: return '🏃';
    }
  };

  let msg = `⚽ *EQUIPOS DEL PARTIDO* ⚽\n\n`;

  msg += `🔴 *Equipo Rojos:*\n`;
  if (allocation.rojos.length > 0) {
    allocation.rojos.forEach(p => {
      msg += `${getEmoji(p.posicion)} ${p.nombre} (${getStars(p.nivel)})\n`;
    });
  } else {
    msg += `(Sin jugadores)\n`;
  }

  msg += `\n⚪ *Equipo Blancos:*\n`;
  if (allocation.blancos.length > 0) {
    allocation.blancos.forEach(p => {
      msg += `${getEmoji(p.posicion)} ${p.nombre} (${getStars(p.nivel)})\n`;
    });
  } else {
    msg += `(Sin jugadores)\n`;
  }

  if (allocation.suplentes.length > 0) {
    msg += `\n🔄 *Suplentes:*\n`;
    msg += allocation.suplentes.map(p => `${getEmoji(p.posicion)} ${p.nombre}`).join(', ');
    msg += '\n';
  }

  return encodeURIComponent(msg);
}

// Generate a complete vanilla index.html that users can copy to run anywhere offline!
export function getVanillaCodeString(existingPlayers: Jugador[]): string {
  const playersJson = JSON.stringify(existingPlayers, null, 2);
  
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
  <title>Fútbol 7 — Team Maker App</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* VARIABLES CSS */
    :root {
      --verde-cancha: #2D6A2F;
      --verde-claro: #3A8C3D;
      --verde-pasto: #4CAF50;
      --blanco-linea: #FFFFFF;
      --amarillo-estrella: #F5C518;
      --naranja-accion: #FF6B35;
      --gris-oscuro: #1A1A1A;
      --gris-card: #2C2C2C;
      --font-title: 'Oswald', sans-serif;
      --font-body: 'Barlow Condensed', sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: var(--font-body);
      background-color: var(--gris-oscuro);
      color: var(--blanco-linea);
      display: flex;
      justify-content: center;
      min-height: 100vh;
      overflow-x: hidden;
    }

    .app-container {
      width: 100%;
      max-width: 420px;
      min-height: 100vh;
      background: linear-gradient(to bottom, var(--verde-cancha), #1A3A1B);
      display: flex;
      flex-direction: flex-col;
      position: relative;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      flex-direction: column;
    }

    header {
      background-color: rgba(26, 26, 26, 0.4);
      padding: 16px;
      text-align: center;
      border-bottom: 2px dashed rgba(255, 255, 255, 0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 40;
      backdrop-filter: blur(8px);
    }

    h1, h2, h3, h4, .title-font {
      font-family: var(--font-title);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    header h1 {
      font-size: 20px;
      color: var(--blanco-linea);
      flex-grow: 1;
    }

    .container-content {
      padding: 16px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 160px;
    }

    /* CARDS */
    .player-card {
      background-color: var(--gris-card);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      margin-bottom: 10px;
      border-left: 5px solid transparent;
      animation: fadeInUp 0.3s ease forwards;
      user-select: none;
    }

    .player-card.pos-arquero { border-left-color: var(--amarillo-estrella); }
    .player-card.pos-defensa { border-left-color: #4FC3F7; }
    .player-card.pos-mediocampista { border-left-color: #81C784; }
    .player-card.pos-delantero { border-left-color: var(--naranja-accion); }

    .player-card.draggable {
      cursor: grab;
    }
    .player-card.draggable:active {
      cursor: grabbing;
    }

    .player-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pos-icon-badge {
      font-size: 20px;
      width: 36px;
      height: 36px;
      background-color: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .player-name {
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    .stars-display {
      color: var(--amarillo-estrella);
      font-size: 13px;
      letter-spacing: 1px;
    }

    .player-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      background: none;
      border: none;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      font-size: 16px;
      padding: 6px;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn-icon:hover {
      background-color: rgba(255,255,255,0.1);
      color: var(--blanco-linea);
    }
    .btn-icon.delete:hover {
      background-color: rgba(244, 67, 54, 0.1);
      color: #FF5252;
    }

    /* BUTTONS */
    .btn-main {
      background-color: var(--naranja-accion);
      color: var(--blanco-linea);
      border: none;
      border-radius: 24px;
      padding: 12px 24px;
      font-family: var(--font-title);
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      width: 100%;
      text-decoration: none;
    }
    .btn-main:active {
      transform: scale(0.98);
      box-shadow: 0 2px 6px rgba(255, 107, 53, 0.2);
    }

    .btn-float {
      position: absolute;
      bottom: 90px;
      right: 16px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--naranja-accion);
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 30;
      transition: transform 0.2s;
    }
    .btn-float:active {
      transform: scale(0.9);
    }

    /* MODAL */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
    }

    .modal-content {
      background-color: #222;
      width: 100%;
      max-width: 380px;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }

    .modal-title {
      font-size: 20px;
      margin-bottom: 20px;
      text-align: center;
      color: var(--blanco-linea);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 10px;
    }

    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      text-transform: uppercase;
      font-family: var(--font-title);
      color: #AAA;
    }
    .form-input {
      width: 100%;
      background-color: var(--gris-card);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 10px 12px;
      color: white;
      font-family: var(--font-body);
      font-size: 16px;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--naranja-accion);
    }

    /* POS SELECTOR */
    .pos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .pos-option {
      background-color: var(--gris-card);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }
    .pos-option.selected {
      border-color: var(--naranja-accion);
      background-color: rgba(255, 107, 53, 0.15);
    }

    /* STARS FORM */
    .stars-selector {
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 10px 0;
    }
    .star-btn {
      font-size: 28px;
      color: rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: transform 0.1s, color 0.1s;
    }
    .star-btn.active {
      color: var(--amarillo-estrella);
    }

    .modal-buttons {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .btn-secondary {
      background-color: transparent;
      color: #BBB;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 24px;
      padding: 12px;
      flex: 1;
      font-family: var(--font-title);
      text-transform: uppercase;
      font-weight: bold;
      cursor: pointer;
    }

    /* SELECCION CONVOCADOS */
    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      width: 100%;
    }
    .custom-checkbox {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 2px solid rgba(255,255,255,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: transparent;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .checkbox-container input:checked + .custom-checkbox {
      background-color: var(--naranja-accion);
      border-color: var(--naranja-accion);
      color: white;
    }
    .check-label {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-sticky {
      background-color: rgba(26,26,26,0.9);
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* TEAMS SCREEN */
    .teams-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .team-column {
      background-color: rgba(26, 26, 26, 0.65);
      border-radius: 16px;
      padding: 14px;
      border: 2px dashed transparent;
      transition: all 0.2s;
    }
    .team-column.dragover {
      border-color: var(--verde-pasto);
      background-color: rgba(76, 175, 80, 0.1);
    }
    .team-title {
      font-size: 16px;
      margin-bottom: 12px;
      color: var(--blanco-linea);
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 6px;
    }

    .team-list {
      min-height: 100px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .placeholder-card {
      color: rgba(255,255,255,0.25);
      text-align: center;
      padding: 16px;
      font-size: 14px;
      border: 1px dashed rgba(255,255,255,0.1);
      border-radius: 8px;
    }

    /* FOOTER/CONTAINER FOOTER */
    .button-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(26,26,26,0.95), rgba(26,26,26,0.8));
      padding: 16px;
      box-shadow: 0 -4px 10px rgba(0,0,0,0.3);
      z-index: 30;
      display: flex;
      gap: 12px;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert {
      background-color: #E53935;
      color: white;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      margin-bottom: 12px;
      text-align: center;
      animation: fadeInUp 0.2s ease;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <header>
      <button class="btn-icon" id="btn-back" style="visibility: hidden;">&#8592;</button>
      <h1 id="screen-title">Manejador de Convocados</h1>
      <button class="btn-icon" style="visibility: hidden;">&#8592;</button>
    </header>

    <div class="container-content" id="app-content">
      <!-- Content injected by JavaScript -->
    </div>

    <!-- Modals and dynamic sections -->
    <div id="modal-container"></div>
  </div>

  <script>
    // PRE LOADED DATA
    const DEFAULT_JUGADORES = ${playersJson};

    const STORAGE_KEY = 'futbol7_jugadores';

    let jugadores = [];
    let convocados = new Set();
    
    // Setup state
    let currentScreen = 'list'; // 'list' | 'convocate' | 'teams'
    let editingJugador = null; // null or playerId
    let selectedPositionsMap = {
      'arquero': '🥅 arquero',
      'defensa': '🛡️ defensa',
      'mediocampista': '⚙️ mediocampista',
      'delantero': '⚡ delantero'
    };

    // Allocation State
    let teamAllocation = {
      blancos: [],
      rojos: [],
      suplentes: []
    };

    function loadLocalStorage() {
      try {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val !== null) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            jugadores = parsed;
            return;
          }
        }
      } catch (e) {
        console.error("Error reading localStorage", e);
      }
      jugadores = [...DEFAULT_JUGADORES];
      saveLocalStorage();
    }

    function saveLocalStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jugadores));
      } catch (e) {
        console.error("Error writing localStorage", e);
      }
    }

    // Init
    loadLocalStorage();

    // App router
    function navigateTo(screen) {
      currentScreen = screen;
      const backBtn = document.getElementById('btn-back');
      const titleEl = document.getElementById('screen-title');
      
      if (screen === 'list') {
        backBtn.style.visibility = 'hidden';
        titleEl.textContent = 'Jugadores Guardados';
        renderListScreen();
      } else if (screen === 'convocate') {
        backBtn.style.visibility = 'visible';
        titleEl.textContent = 'Seleccionar Convocados';
        renderConvocateScreen();
      } else if (screen === 'teams') {
        backBtn.style.visibility = 'visible';
        titleEl.textContent = 'Equipos finalizados';
        renderTeamsScreen();
      }
    }

    document.getElementById('btn-back').addEventListener('click', () => {
      if (currentScreen === 'convocate') {
        navigateTo('list');
      } else if (currentScreen === 'teams') {
        navigateTo('convocate');
      }
    });

    // RENDER LIST SCREEN
    function renderListScreen() {
      const container = document.getElementById('app-content');
      container.innerHTML = '';

      const countHeader = document.createElement('div');
      countHeader.className = 'header-sticky';
      countHeader.innerHTML = \`
        <div class="title-font">Total registrados: \${jugadores.length}</div>
        <div class="stars-display">⚽ Fútbol 7</div>
      \`;
      container.appendChild(countHeader);

      const listDiv = document.createElement('div');
      listDiv.style.flexGrow = '1';
      listDiv.style.overflowY = 'auto';

      if (jugadores.length === 0) {
        listDiv.innerHTML = '<div class="placeholder-card" style="margin-top: 40px;">No tienes jugadores registrados. <br>¡Crea tu primer jugador con el botón +!</div>';
      } else {
        jugadores.forEach(j => {
          const card = document.createElement('div');
          card.className = 'player-card pos-' + j.posicion;
          
          let emoji = '🏃';
          if (j.posicion === 'arquero') emoji = '🥅';
          else if (j.posicion === 'defensa') emoji = '🛡️';
          else if (j.posicion === 'mediocampista') emoji = '⚙️';
          else if (j.posicion === 'delantero') emoji = '⚡';

          let starText = '★'.repeat(j.nivel) + '☆'.repeat(5 - j.nivel);

          card.innerHTML = \`
            <div class="player-info" onclick="openEditModal('\${j.id}')" style="cursor: pointer; flex-grow: 1;">
              <div class="pos-icon-badge">\${emoji}</div>
              <div>
                <div class="player-name">\${j.nombre}</div>
                <div class="stars-display">\${starText}</div>
              </div>
            </div>
            <div class="player-actions">
              <button class="btn-icon" onclick="openEditModal('\${j.id}')">&#9998;</button>
              <button class="btn-icon delete" onclick="deletePlayer('\${j.id}')">&#128465;</button>
            </div>
          \`;
          listDiv.appendChild(card);
        });
      }
      container.appendChild(listDiv);

      // Foot btn (with both Armar Partido and Añadir Jugador vertically)
      const footDiv = document.createElement('div');
      footDiv.className = 'button-container';
      footDiv.style.flexDirection = 'column';
      footDiv.style.gap = '8px';
      footDiv.innerHTML = \`
        <button class="btn-main" id="btn-start-party" style="margin-bottom: 0;">ARMAR PARTIDO 🔥</button>
        <button class="btn-secondary" id="btn-add-player-footer" style="width: 100%; font-size: 14px; padding: 10px; border: 1px dashed var(--naranja-accion); color: var(--naranja-accion); border-radius: 24px; font-weight: bold; font-family: var(--font-title); text-transform: uppercase; background: rgba(255,107,53,0.05); cursor: pointer; transition: all 0.2s;">+ Añadir Jugador</button>
      \`;
      container.appendChild(footDiv);

      document.getElementById('btn-start-party').addEventListener('click', () => {
        navigateTo('convocate');
      });

      document.getElementById('btn-add-player-footer').addEventListener('click', () => {
        openAddModal();
      });
    }

    // DELETE PLAYER WITH POLISHED MODAL OVERLAY (Saves iframe compatibility)
    window.deletePlayer = function(id) {
      const j = jugadores.find(x => x.id === id);
      if (!j) return;

      const modalCont = document.getElementById('modal-container');
      modalCont.innerHTML = \`
        <div class="modal-overlay">
          <div class="modal-content animate-fade-in-up" style="max-width: 320px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 36px; display: block; margin-top: 5px;">🗑️</span>
            <h2 class="modal-title" style="border: none; margin-bottom: 4px; padding-bottom: 0;">¿Eliminar jugador?</h2>
            <p style="font-size: 14px; color: #CCC; margin-bottom: 20px; font-family: sans-serif; line-height: 1.4;">
              ¿Estás seguro de que deseas eliminar a <strong style="color: white">\${j.nombre}</strong> de la base de datos?
            </p>
            <div class="modal-buttons" style="width: 100%; display: flex; gap: 10px;">
              <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">Cancelar</button>
              <button type="button" class="btn-main" style="background-color: #EF4444; color: white; border: none; flex: 1; box-shadow: none;" onclick="confirmDeletePlayer('\${id}')">Eliminar</button>
            </div>
          </div>
        </div>
      \`;
    };

    window.confirmDeletePlayer = function(id) {
      jugadores = jugadores.filter(j => j.id !== id);
      convocados.delete(id);
      saveLocalStorage();
      closeModal();
      navigateTo(currentScreen);
    };

    // FORM MODAL STATE
    let formPos = 'mediocampista';
    let formNivel = 3;

    function openAddModal() {
      editingJugador = null;
      formPos = 'mediocampista';
      formNivel = 3;
      showFormModal('Agregar Jugador');
    }

    window.openEditModal = function(id) {
      const j = jugadores.find(x => x.id === id);
      if (!j) return;
      editingJugador = id;
      formPos = j.posicion;
      formNivel = j.nivel;
      showFormModal('Editar Jugador', j.nombre);
    };

    function showFormModal(title, prefilledName = '') {
      const modalCont = document.getElementById('modal-container');
      modalCont.innerHTML = \`
        <div class="modal-overlay">
          <div class="modal-content animate-fade-in-up">
            <h2 class="modal-title">\${title}</h2>
            <form id="player-form" onsubmit="handleFormSubmit(event)">
              <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="form-name" class="form-input" required placeholder="Ej: Rodrigo" value="\${prefilledName}">
              </div>

              <div class="form-group">
                <label>Posición</label>
                <div class="pos-grid">
                  <div class="pos-option \${formPos === 'arquero' ? 'selected' : ''}" onclick="selectPos('arquero')">🥅 Arquero</div>
                  <div class="pos-option \${formPos === 'defensa' ? 'selected' : ''}" onclick="selectPos('defensa')">🛡️ Defensa</div>
                  <div class="pos-option \${formPos === 'mediocampista' ? 'selected' : ''}" onclick="selectPos('mediocampista')">⚙️ Medio</div>
                  <div class="pos-option \${formPos === 'delantero' ? 'selected' : ''}" onclick="selectPos('delantero')">⚡ Delantero</div>
                </div>
              </div>

              <div class="form-group">
                <label style="text-align: center;">Nivel (de 1 a 5 estrellas)</label>
                <div class="stars-selector" id="stars-row">
                  <!-- stars in js -->
                </div>
              </div>

              <div class="modal-buttons">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn-main" style="flex: 1; box-shadow: none;">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      \`;

      renderStarsRow();
    }

    window.selectPos = function(pos) {
      formPos = pos;
      const opts = document.querySelectorAll('.pos-option');
      opts.forEach(o => o.classList.remove('selected'));
      event.target.classList.add('selected');
    };

    window.selectStar = function(val) {
      formNivel = val;
      renderStarsRow();
    };

    function renderStarsRow() {
      const row = document.getElementById('stars-row');
      if (!row) return;
      row.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        row.innerHTML += \`<span class="star-btn \${i <= formNivel ? 'active' : ''}" onclick="selectStar(\${i})">★</span>\`;
      }
    }

    window.closeModal = function() {
      document.getElementById('modal-container').innerHTML = '';
    };

    window.handleFormSubmit = function(e) {
      e.preventDefault();
      const name = document.getElementById('form-name').value.trim();
      if (!name) return;

      if (editingJugador) {
        // Edit
        jugadores = jugadores.map(j => {
          if (j.id === editingJugador) {
            return { ...j, nombre: name, posicion: formPos, nivel: formNivel };
          }
          return j;
        });
      } else {
        // Add
        const newJ = {
          id: Date.now() + '-' + Math.floor(Math.random() * 1000),
          nombre: name,
          posicion: formPos,
          nivel: formNivel
        };
        jugadores.push(newJ);
      }

      saveLocalStorage();
      closeModal();
      navigateTo(currentScreen); // Re-render whichever screen we were on
    };

    // RENDER CONVOCADOS SCREEN
    function renderConvocateScreen() {
      const container = document.getElementById('app-content');
      container.innerHTML = '';

      // Set initial convocated is empty or prefilled with all if let's say they want quick start
      if (convocados.size === 0) {
        // Select all by default for better speed
        jugadores.forEach(j => convocados.add(j.id));
      }

      const alertContainer = document.createElement('div');
      alertContainer.id = 'alert-area';
      container.appendChild(alertContainer);

      const head = document.createElement('div');
      head.className = 'header-sticky';
      head.innerHTML = \`
        <div class="title-font" id="convocate-count">Convocados: \${convocados.size} / 14+</div>
        <div>Mínimo 14</div>
      \`;
      container.appendChild(head);

      const listDiv = document.createElement('div');
      listDiv.style.flexGrow = '1';
      listDiv.style.overflowY = 'auto';

      if (jugadores.length === 0) {
        listDiv.innerHTML = '<div class="placeholder-card" style="margin-top: 40px;">Registra jugadores en la pantalla principal para poder convocarlos.</div>';
      } else {
        jugadores.forEach(j => {
          const card = document.createElement('div');
          card.className = 'player-card pos-' + j.posicion;
          
          let emoji = '🏃';
          if (j.posicion === 'arquero') emoji = '🥅';
          else if (j.posicion === 'defensa') emoji = '🛡️';
          else if (j.posicion === 'mediocampista') emoji = '⚙️';
          else if (j.posicion === 'delantero') emoji = '⚡';

          let starText = '★'.repeat(j.nivel) + '☆'.repeat(5 - j.nivel);
          const isChecked = convocados.has(j.id);

          card.innerHTML = \`
            <label class="checkbox-container">
              <input type="checkbox" style="display:none;" \${isChecked ? 'checked' : ''} onchange="toggleConvocado('\${j.id}')">
              <div class="custom-checkbox">\${isChecked ? '✓' : ''}</div>
              <div class="check-label">
                <div class="player-info">
                  <div class="pos-icon-badge">\${emoji}</div>
                  <div>
                    <div class="player-name">\${j.nombre}</div>
                    <div class="stars-display">\${starText}</div>
                  </div>
                </div>
              </div>
            </label>
          \`;
          listDiv.appendChild(card);
        });
      }
      container.appendChild(listDiv);

      // Actions footer
      const foot = document.createElement('div');
      foot.className = 'button-container';
      foot.innerHTML = \`
        <button class="btn-main" id="btn-divide">DIVIDIR EQUIPOS ⚔️</button>
      \`;
      container.appendChild(foot);

      document.getElementById('btn-divide').addEventListener('click', () => {
        if (convocados.size < 14) {
          const area = document.getElementById('alert-area');
          area.innerHTML = \`
            <div class="alert">⚠️ ¡Faltan convocados! Necesitas al menos 14 jugadores seleccionados para armar equipos de fútbol 7 (actualmente tienes \${convocados.size}).</div>
          \`;
          setTimeout(() => { area.innerHTML = ''; }, 4500);
          return;
        }

        // Run automatic distribution
        const selectedList = jugadores.filter(j => convocados.has(j.id));
        automaticDistribution(selectedList);
        navigateTo('teams');
      });
    }

    window.toggleConvocado = function(id) {
      if (convocados.has(id)) {
        convocados.delete(id);
      } else {
        convocados.add(id);
      }
      document.getElementById('convocate-count').textContent = \`Convocados: \${convocados.size} / 14+\`;
      renderConvocateScreen();
    };

    // AUTOMATIC DISTRIBUTION ALGORITHM
    function automaticDistribution(selectedList) {
      const arqueros = selectedList.filter(p => p.posicion === 'arquero');
      const others = selectedList.filter(p => p.posicion !== 'arquero');

      others.sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre));

      const blancos = [];
      const rojos = [];
      const suplentes = [];

      if (arqueros.length >= 2) {
        blancos.push(arqueros[0]);
        rojos.push(arqueros[1]);
        for (let i = 2; i < arqueros.length; i++) {
          others.push(arqueros[i]);
        }
      } else if (arqueros.length === 1) {
        blancos.push(arqueros[0]);
      }

      others.sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre));

      for (const player of others) {
        if (blancos.length < 7 && rojos.length < 7) {
          if (blancos.length < rojos.length) {
            blancos.push(player);
          } else if (rojos.length < blancos.length) {
            rojos.push(player);
          } else {
            const powerB = blancos.reduce((s, p) => s + p.nivel, 0);
            const powerR = rojos.reduce((s, p) => s + p.nivel, 0);
            if (powerB <= powerR) {
              blancos.push(player);
            } else {
              rojos.push(player);
            }
          }
        } else if (blancos.length < 7) {
          blancos.push(player);
        } else if (rojos.length < 7) {
          rojos.push(player);
        } else {
          suplentes.push(player);
        }
      }

      teamAllocation = { blancos, rojos, suplentes };
    }

    // RENDER TEAMS SCREEN WITH DRAG & DROP
    let draggedPlayerId = null;
    let draggedSourceZone = null;

    function renderTeamsScreen() {
      const container = document.getElementById('app-content');
      container.innerHTML = '';

      const statsBar = document.createElement('div');
      statsBar.className = 'header-sticky';
      const powerB = teamAllocation.blancos.reduce((s, p) => s + p.nivel, 0);
      const powerR = teamAllocation.rojos.reduce((s, p) => s + p.nivel, 0);
      statsBar.innerHTML = \`
        <div class="title-font">⚪ BLANCOS: \${powerB}⭐</div>
        <div class="title-font" style="color: #FF5252">🔴 ROJOS: \${powerR}⭐</div>
      \`;
      container.appendChild(statsBar);

      // Drag instructions hint
      const hint = document.createElement('div');
      hint.style.fontSize = '12px';
      hint.style.textAlign = 'center';
      hint.style.color = '#888';
      hint.style.marginBottom = '10px';
      hint.textContent = '💡 Arrastra jugadores entre equipos para reordenar';
      container.appendChild(hint);

      const gridDiv = document.createElement('div');
      gridDiv.className = 'teams-grid';

      // ⚪ Team Blancos Zone
      const whitesColumn = createTeamColumn('blancos', '⚪ Blancos', teamAllocation.blancos);
      gridDiv.appendChild(whitesColumn);

      // 🔴 Team Rojos Zone
      const redsColumn = createTeamColumn('rojos', '🔴 Rojos', teamAllocation.rojos);
      gridDiv.appendChild(redsColumn);

      // 🔄 Suplentes Zone (always display even if empty to drag to/from)
      const suplentesColumn = createTeamColumn('suplentes', '🔄 Suplentes', teamAllocation.suplentes);
      gridDiv.appendChild(suplentesColumn);

      container.appendChild(gridDiv);

      // Foot buttons
      const foot = document.createElement('div');
      foot.className = 'button-container';
      foot.innerHTML = \`
        <button class="btn-main" style="background-color: transparent; border: 1px solid var(--naranja-accion); color: var(--naranja-accion); flex: 1;" id="btn-reset">↩️ NUEVA SELECCIÓN</button>
        <button class="btn-main" style="flex: 1.3;" id="btn-share">📲 WHATSAPP</button>
      \`;
      container.appendChild(foot);

      document.getElementById('btn-reset').addEventListener('click', () => {
        navigateTo('convocate');
      });

      document.getElementById('btn-share').addEventListener('click', () => {
        shareOnWhatsApp();
      });

      setupDragAndDropEvents();
    }

    function createTeamColumn(zoneKey, label, playerList) {
      const col = document.createElement('div');
      col.className = 'team-column';
      col.setAttribute('data-zone', zoneKey);
      col.id = \`zone-\${zoneKey}\`;

      const header = document.createElement('div');
      header.className = 'team-title title-font';
      header.innerHTML = \`
        <span>\${label}</span>
        <span style="font-size: 13px; color: #AAA;">\${playerList.length} jugadores</span>
      \`;
      col.appendChild(header);

      const listDiv = document.createElement('div');
      listDiv.className = 'team-list';
      listDiv.id = \`list-\${zoneKey}\`;

      if (playerList.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-card';
        placeholder.textContent = 'Arrastra jugadores aquí';
        listDiv.appendChild(placeholder);
      } else {
        playerList.forEach(p => {
          const card = document.createElement('div');
          card.className = 'player-card pos-' + p.posicion + ' draggable';
          card.setAttribute('draggable', 'true');
          card.setAttribute('data-id', p.id);
          card.setAttribute('data-source', zoneKey);
          
          let emoji = '🏃';
          if (p.posicion === 'arquero') emoji = '🥅';
          else if (p.posicion === 'defensa') emoji = '🛡️';
          else if (p.posicion === 'mediocampista') emoji = '⚙️';
          else if (p.posicion === 'delantero') emoji = '⚡';

          let starText = '★'.repeat(p.nivel) + '☆'.repeat(5 - p.nivel);

          card.innerHTML = \`
            <div class="player-info">
              <div class="pos-icon-badge">\${emoji}</div>
              <div>
                <div class="player-name">\${p.nombre}</div>
                <div class="stars-display">\${starText}</div>
              </div>
            </div>
            <div style="font-size: 18px; color: rgba(255,255,255,0.2); cursor: grab; padding-right: 4px;">☰</div>
          \`;

          listDiv.appendChild(card);
        });
      }

      col.appendChild(listDiv);
      return col;
    }

    // DESKTOP & MOBILE DRAG AND DROP LOGIC
    function setupDragAndDropEvents() {
      // 1. Desktop HTML5 Drag & Drop
      const cards = document.querySelectorAll('.player-card.draggable');
      const zones = document.querySelectorAll('.team-column');

      cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
          draggedPlayerId = card.getAttribute('data-id');
          draggedSourceZone = card.getAttribute('data-source');
          card.style.opacity = '0.5';
          e.dataTransfer.setData('text/plain', draggedPlayerId);
        });

        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
          zones.forEach(z => z.classList.remove('dragover'));
        });
      });

      zones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetZone = zone.getAttribute('data-zone');
          if (draggedPlayerId && draggedSourceZone && targetZone !== draggedSourceZone) {
            movePlayer(draggedPlayerId, draggedSourceZone, targetZone);
          }
          draggedPlayerId = null;
          draggedSourceZone = null;
        });
      });

      // 2. MOBILE TOUCH EVENTS DRAG AND DROP SUPPORT
      let touchActiveCard = null;
      let startX, startY;

      cards.forEach(card => {
        card.addEventListener('touchstart', (e) => {
          // Disable default screen scrolling when initiating drag
          draggedPlayerId = card.getAttribute('data-id');
          draggedSourceZone = card.getAttribute('data-source');
          card.style.opacity = '0.5';
          touchActiveCard = card;
          const touch = e.touches[0];
          startX = touch.clientX;
          startY = touch.clientY;
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
          if (!touchActiveCard) return;
          const touch = e.touches[0];
          
          // Visual indication of hover over zone
          const elementOver = document.elementFromPoint(touch.clientX, touch.clientY);
          const zoneEl = elementOver ? elementOver.closest('.team-column') : null;
          
          zones.forEach(z => z.classList.remove('dragover'));
          if (zoneEl) {
            zoneEl.classList.add('dragover');
          }
          
          // If moving substantially, prevent window scrolling to focus on the Drag
          if (Math.abs(touch.clientY - startY) > 10) {
            if (e.cancelable) e.preventDefault();
          }
        }, { passive: false });

        card.addEventListener('touchend', (e) => {
          if (!touchActiveCard) return;
          touchActiveCard.style.opacity = '1';
          
          const touch = e.changedTouches[0];
          const elementOver = document.elementFromPoint(touch.clientX, touch.clientY);
          const zoneEl = elementOver ? elementOver.closest('.team-column') : null;

          zones.forEach(z => z.classList.remove('dragover'));

          if (zoneEl) {
            const targetZone = zoneEl.getAttribute('data-zone');
            if (draggedPlayerId && draggedSourceZone && targetZone !== draggedSourceZone) {
              movePlayer(draggedPlayerId, draggedSourceZone, targetZone);
            }
          }

          touchActiveCard = null;
          draggedPlayerId = null;
          draggedSourceZone = null;
        });
      });
    }

    function movePlayer(playerId, sourceZone, targetZone) {
      // Find the player object
      let playerObj = null;
      
      // Find and remove from source
      teamAllocation[sourceZone] = teamAllocation[sourceZone].filter(p => {
        if (p.id === playerId) {
          playerObj = p;
          return false;
        }
        return true;
      });

      if (playerObj) {
        // Enforce the rule: "Jugadores por equipo: Exactamente 7 (más suplentes si los hay)"
        // If they drop more than 7 players in rojos or blancos, alert them or put extra in suplentes
        if ((targetZone === 'blancos' || targetZone === 'rojos') && teamAllocation[targetZone].length >= 7) {
          alert('⚠️ El equipo ya tiene un máximo de 7 jugadores. Mueve a alguien a suplentes primero o intercambialos.');
          // Put back in source
          teamAllocation[sourceZone].push(playerObj);
        } else {
          // Add to target
          teamAllocation[targetZone].push(playerObj);
        }
      }

      renderTeamsScreen();
    }

    // SHARE LOGIC ON WHATSAPP
    function shareOnWhatsApp() {
      const getStars = (level) => '★'.repeat(level) + '☆'.repeat(5 - level);
      const getEmoji = (pos) => {
        switch (pos) {
          case 'arquero': return '🥅';
          case 'defensa': return '🛡️';
          case 'mediocampista': return '⚙️';
          case 'delantero': return '⚡';
          default: return '🏃';
        }
      };

      let msg = \`⚽ *EQUIPOS DEL PARTIDO* ⚽\\n\\n\`;

      msg += \`🔴 *Equipo Rojos:*\\n\`;
      if (teamAllocation.rojos.length > 0) {
        teamAllocation.rojos.forEach(p => {
          msg += \`\${getEmoji(p.posicion)} \${p.nombre} (\${getStars(p.nivel)})\\n\`;
        });
      } else {
        msg += \`(Sin jugadores)\\n\`;
      }

      msg += \`\\n⚪ *Equipo Blancos:*\\n\`;
      if (teamAllocation.blancos.length > 0) {
        teamAllocation.blancos.forEach(p => {
          msg += \`\${getEmoji(p.posicion)} \${p.nombre} (\${getStars(p.nivel)})\\n\`;
        });
      } else {
        msg += \`(Sin jugadores)\\n\`;
      }

      if (teamAllocation.suplentes.length > 0) {
        msg += \`\\n🔄 *Suplentes:*\\n\`;
        msg += teamAllocation.suplentes.map(p => \`\${getEmoji(p.posicion)} \${p.nombre}\`).join(', ');
        msg += '\\n';
      }

      const encoded = encodeURIComponent(msg);
      window.open(\`https://wa.me/?text=\${encoded}\`, '_blank');
    }

    // Default Navigation startup
    navigateTo('list');
  </script>
</body>
</html>`;
}
