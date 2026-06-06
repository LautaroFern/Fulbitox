import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft, 
  Share2, 
  Star, 
  Download, 
  Copy, 
  Check, 
  X, 
  Info,
  ChevronRight,
  Sparkles,
  Users
} from 'lucide-react';
import { 
  loadJugadores, 
  saveJugadores, 
  balanceTeams, 
  formatWhatsAppMessage, 
  getVanillaCodeString 
} from './utils';
import { Jugador, Screen, TeamAllocation, Posicion } from './types';

export default function App() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [convocados, setConvocados] = useState<Set<string>>(new Set());
  const [screen, setScreen] = useState<Screen>('list');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPos, setFormPos] = useState<Posicion>('mediocampista');
  const [formNivel, setFormNivel] = useState(3);

  // Standalone HTML code exporter state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Balanced team allocation
  const [allocation, setAllocation] = useState<TeamAllocation>({
    blancos: [],
    rojos: [],
    suplentes: []
  });

  // Track dragging state (works for both HTML5 with dropzone and custom Touch tracking)
  const [draggedItem, setDraggedItem] = useState<{ id: string; source: keyof TeamAllocation } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<keyof TeamAllocation | null>(null);

  // Player deletion confirmation state
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<Jugador | null>(null);

  // Initial load
  useEffect(() => {
    const list = loadJugadores();
    setJugadores(list);
    // Auto-select all players for convocados initially to save clicks!
    const defaultConvocados = new Set(list.map(p => p.id));
    setConvocados(defaultConvocados);
  }, []);

  // Sync to localstorage whenever players array changes
  const updatePlayersState = (newPlayers: Jugador[]) => {
    setJugadores(newPlayers);
    saveJugadores(newPlayers);
  };

  // Positions configurations
  const POS_CONFIG = {
    arquero: { emoji: '🥅', name: 'Arquero', bg: 'border-l-4 border-l-[#F5C518]' },
    defensa: { emoji: '🛡️', name: 'Defensa', bg: 'border-l-4 border-l-[#4FC3F7]' },
    mediocampista: { emoji: '⚙️', name: 'Mediocampista', bg: 'border-l-4 border-l-[#81C784]' },
    delantero: { emoji: '⚡', name: 'Delantero', bg: 'border-l-4 border-l-[#FF6B35]' }
  };

  const getPosBadgeClass = (pos: Posicion) => {
    switch (pos) {
      case 'arquero': return 'bg-[#F5C518]/10 text-[#F5C518]';
      case 'defensa': return 'bg-[#4FC3F7]/10 text-[#4FC3F7]';
      case 'mediocampista': return 'bg-[#81C784]/10 text-[#81C784]';
      case 'delantero': return 'bg-[#FF6B35]/10 text-[#FF6B35]';
    }
  };

  // Helper alert notifier
  const triggerAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => {
      setAlertMsg(null);
    }, 4500);
  };

  // CRUD actions
  const handleDeletePlayer = (j: Jugador, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmPlayer(j);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormPos('mediocampista');
    setFormNivel(3);
    setIsModalOpen(true);
  };

  const openEditModal = (j: Jugador, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(j.id);
    setFormName(j.nombre);
    setFormPos(j.posicion);
    setFormNivel(j.nivel);
    setIsModalOpen(true);
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      // Edit
      const updated = jugadores.map(j => {
        if (j.id === editingId) {
          return { ...j, nombre: formName.trim(), posicion: formPos, nivel: formNivel };
        }
        return j;
      });
      updatePlayersState(updated);
    } else {
      // Create new UUID or fallback date
      const newId = crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newPlayer: Jugador = {
        id: newId,
        nombre: formName.trim(),
        posicion: formPos,
        nivel: formNivel
      };
      const updated = [...jugadores, newPlayer];
      updatePlayersState(updated);
      
      // Auto convocated as well
      const newConvocados = new Set(convocados);
      newConvocados.add(newId);
      setConvocados(newConvocados);
    }

    setIsModalOpen(false);
  };

  // Convocates checkboxes toggle
  const toggleConvocado = (id: string) => {
    const next = new Set(convocados);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setConvocados(next);
  };

  const handleDivideTeams = () => {
    if (convocados.size < 14) {
      triggerAlert(`⚠️ ¡Convocados insuficientes! Debes seleccionar al menos 14 jugadores (tienes ${convocados.size}).`);
      return;
    }
    const selected = jugadores.filter(j => convocados.has(j.id));
    const result = balanceTeams(selected);
    setAllocation(result);
    setScreen('teams');
  };

  // Drag of items manually
  const movePlayer = (id: string, source: keyof TeamAllocation, dest: keyof TeamAllocation) => {
    if (source === dest) return;

    // Check 7 players rule
    if ((dest === 'blancos' || dest === 'rojos') && allocation[dest].length >= 7) {
      triggerAlert(`⚠️ ¡Límite alcanzado! El equipo ${dest.toUpperCase()} ya cuenta con 7 jugadores. Mueve a alguien a suplentes primero.`);
      return;
    }

    let draggedObj: Jugador | undefined;
    const nextSourceList = allocation[source].filter(p => {
      if (p.id === id) {
        draggedObj = p;
        return false;
      }
      return true;
    });

    if (draggedObj) {
      const nextDestList = [...allocation[dest], draggedObj];
      setAllocation({
        ...allocation,
        [source]: nextSourceList,
        [dest]: nextDestList
      });
    }
  };

  // Standard Drag Drop over desktop
  const handleDragStart = (id: string, source: keyof TeamAllocation, e: React.DragEvent) => {
    setDraggedItem({ id, source });
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (destZone: keyof TeamAllocation) => {
    if (draggedItem && draggedItem.source !== destZone) {
      movePlayer(draggedItem.id, draggedItem.source, destZone);
    }
    setDraggedItem(null);
    setDragOverZone(null);
  };

  // Touch handlers for responsive drag & drop simulation on phone screens
  const handleTouchStart = (id: string, source: keyof TeamAllocation) => {
    setDraggedItem({ id, source });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedItem) return;
    const touch = e.touches[0];
    const elementOver = document.elementFromPoint(touch.clientX, touch.clientY);
    const zoneEl = elementOver ? elementOver.closest('[data-zone]') : null;
    
    if (zoneEl) {
      const destZone = zoneEl.getAttribute('data-zone') as keyof TeamAllocation;
      setDragOverZone(destZone);
    } else {
      setDragOverZone(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedItem) return;
    const touch = e.changedTouches[0];
    const elementOver = document.elementFromPoint(touch.clientX, touch.clientY);
    const zoneEl = elementOver ? elementOver.closest('[data-zone]') : null;
    
    if (zoneEl) {
      const destZone = zoneEl.getAttribute('data-zone') as keyof TeamAllocation;
      if (destZone !== draggedItem.source) {
        movePlayer(draggedItem.id, draggedItem.source, destZone);
      }
    }
    
    setDraggedItem(null);
    setDragOverZone(null);
  };

  // WhatsApp share opening
  const handleShareWhatsApp = () => {
    const encoded = formatWhatsAppMessage(allocation);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Standalone code copy helper
  const handleCopyCode = () => {
    const code = getVanillaCodeString(jugadores);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-[#111111] py-0 sm:py-8 flex justify-center items-start text-white overflow-x-hidden select-none">
      {/* Phone container */}
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-[840px] sm:rounded-[32px] sm:border-8 sm:border-[#2C2C2C] bg-gradient-to-b from-[#2D6A2F] to-[#1A3A1B] flex flex-col relative shadow-2xl overflow-hidden sm:my-2">
        
        {/* Header bar simulated phone earpeice and bezel for top */}
        <div className="hidden sm:flex justify-center items-center h-6 w-full bg-[#2C2C2C] relative z-50">
          <div className="w-24 h-4 bg-black rounded-b-xl absolute top-0"></div>
        </div>

        {/* Dynamic Alert Banner */}
        {alertMsg && (
          <div className="absolute top-16 left-4 right-4 z-50 animate-fade-in-up">
            <div className="bg-[#E53935] text-white text-sm py-3 px-4 rounded-xl shadow-lg font-medium text-center border border-white/10">
              {alertMsg}
            </div>
          </div>
        )}

        {/* App Header */}
        <header className="bg-[#1A1A1A]/70 backdrop-blur-md px-4 py-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {screen !== 'list' && (
              <button 
                onClick={() => setScreen(screen === 'teams' ? 'convocate' : 'list')}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl font-title font-bold tracking-wide uppercase flex items-center gap-1.5 text-white">
              <span>⚽ F7 Maker</span>
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Super friendly Single-File download button for user convenience! */}
            <button 
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1.5 bg-[#FF6B35]/20 hover:bg-[#FF6B35]/30 text-xs font-title font-bold uppercase rounded-lg border border-[#FF6B35]/35 flex items-center gap-1 transition-all cursor-pointer"
              title="Exportar archivo index.html standalone"
            >
              <Download size={13} className="text-[#FF6B35]" />
              <span>Exportar</span>
            </button>
          </div>
        </header>

        {/* App Content */}
        <main className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar pb-24">
          
          {/* SCREEN 1: JUGADORES LIST */}
          {screen === 'list' && (
            <div className="flex-1 flex flex-col animate-fade-in-up">
              {/* Top Banner Stats */}
              <div className="bg-[#1A1A1A]/85 rounded-2xl p-4 mb-4 border border-white/5 flex justify-between items-center shadow-lg">
                <div>
                  <div className="text-[11px] text-[#A3E635] tracking-widest uppercase font-title font-semibold">Base de Datos Local</div>
                  <div className="text-2xl font-title font-bold leading-none mt-1">
                    {jugadores.length} <span className="text-sm font-sans font-normal text-gray-400">registrados</span>
                  </div>
                </div>
                <div className="bg-[#2C2C2C] p-2.5 rounded-xl border border-white/5 text-[#FF6B35]">
                  <Users size={20} />
                </div>
              </div>

              {/* Instructions summary */}
              <div className="text-xs text-white/50 mb-4 px-1 text-center italic">
                💡 Toque en cualquier jugador para editar su nombre, posición o habilidades.
              </div>

              {/* Scrollable list integrated into the main container scroll */}
              <div className="space-y-2.5 pr-0.5 pb-44">
                {jugadores.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-[#2C2C2C]/55 rounded-2xl border border-dashed border-white/10">
                    <p className="text-sm text-gray-400">No hay jugadores guardados todavía.</p>
                    <p className="text-xs text-gray-500 mt-2">¡Comienza agregando tu equipo usando el botón de abajo! ⬇️</p>
                  </div>
                ) : (
                  jugadores.map((j) => {
                    const cfg = POS_CONFIG[j.posicion];
                    return (
                      <div 
                        key={j.id}
                        onClick={(e) => openEditModal(j, e)}
                        className={`flex justify-between items-center bg-[#2C2C2C] rounded-2xl p-3.5 shadow-md ${cfg.bg} hover:bg-[#333333] transition-all cursor-pointer`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            {cfg.emoji}
                          </span>
                          <div>
                            <h3 className="font-semibold text-[15px] tracking-wide text-white font-sans">{j.nombre}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[10px] uppercase font-title font-bold px-1.5 py-0.5 rounded ${getPosBadgeClass(j.posicion)}`}>
                                {cfg.name}
                              </span>
                              <div className="flex text-[11px] text-[#F5C518]">
                                {'★'.repeat(j.nivel)}
                                <span className="opacity-25">{'★'.repeat(5 - j.nivel)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => openEditModal(j, e)}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={(e) => handleDeletePlayer(j, e)}
                            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom bar container with stacked buttons */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#1A1A1A]/95 border-t border-white/5 flex flex-col gap-2.5 z-30 shadow-2xl backdrop-blur-md">
                <button 
                  onClick={() => setScreen('convocate')}
                  disabled={jugadores.length === 0}
                  className={`w-full py-3.5 rounded-full font-title font-bold text-base tracking-wider uppercase bg-[#FF6B35] text-white shadow-lg active:scale-98 transition-all hover:bg-[#FF8855] ${jugadores.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Armar Partido 🔥
                </button>
                <button 
                  onClick={openAddModal}
                  className="w-full py-2.5 border border-[#FF6B35]/35 hover:border-[#FF6B35]/60 bg-[#FF6B35]/10 hover:bg-[#FF6B35]/15 active:scale-98 transition-all text-[#FF6B35] rounded-full font-title text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={16} /> Añadir Jugador
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: SELECCION CONVOCADOS */}
          {screen === 'convocate' && (
            <div className="flex-1 flex flex-col animate-fade-in-up">
              {/* Stats & limits info */}
              <div className="bg-[#1A1A1A]/85 rounded-2xl p-4 mb-4 border border-white/5 flex justify-between items-center shadow-lg">
                <div>
                  <div className="text-[11px] text-[#FF6B35] tracking-widest uppercase font-title font-semibold">Seleccionar Quiénes Juegan</div>
                  <div className="text-2xl font-title font-bold leading-none mt-1">
                    {convocados.size} <span className="text-sm font-sans font-normal text-gray-400">/ 14 convocados</span>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400 font-medium">
                  {convocados.size >= 14 ? (
                    <span className="text-[#81C784] font-title font-bold bg-[#81C784]/15 px-2 py-1 rounded">✓ MÍNIMO LOGRADO</span>
                  ) : (
                    <span className="text-red-400 font-title font-semibold bg-red-400/10 px-2 py-1 rounded">FALTAN COMODINES ({14 - convocados.size})</span>
                  )}
                </div>
              </div>

              {/* Active list with selectable checks */}
              <div className="space-y-2 pr-0.5 pb-20">
                {jugadores.map((j) => {
                  const isChecked = convocados.has(j.id);
                  const cfg = POS_CONFIG[j.posicion];
                  return (
                    <div 
                      key={j.id}
                      onClick={() => toggleConvocado(j.id)}
                      className={`flex justify-between items-center rounded-2xl p-3.5 shadow-md border border-white/5 transition-all cursor-pointer ${
                        isChecked ? 'bg-[#2C2C2C] border-l-4 border-l-[#FF6B35]' : 'bg-[#2C2C2C]/50 opacity-40 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isChecked ? 'bg-[#FF6B35] border-[#FF6B35]' : 'border-white/20'
                        }`}>
                          {isChecked && <Check size={14} className="text-white fill-white" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            {cfg.emoji}
                          </span>
                          <div>
                            <h3 className="font-semibold text-sm tracking-wide text-white">{j.nombre}</h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-gray-400">
                                {cfg.name}
                              </span>
                              <span className="text-gray-600 font-light">•</span>
                              <div className="flex text-[10px] text-[#F5C518]">
                                {'★'.repeat(j.nivel)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#1A1A1A]/90 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => setScreen('list')}
                  className="px-4 py-3.5 text-sm uppercase font-title font-bold text-gray-300 hover:text-white border border-white/20 rounded-full cursor-pointer hover:bg-white/5 transition-all"
                >
                  Volver
                </button>
                <button 
                  onClick={handleDivideTeams}
                  className="flex-1 py-3.5 rounded-full font-title font-bold text-base tracking-wider uppercase bg-[#FF6B35] text-white shadow-lg active:scale-98 transition-all hover:bg-[#FF8855] text-center cursor-pointer"
                >
                  Dividir Equipos ⚔️
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: VISTA DE EQUIPOS CON DRAG & DROP */}
          {screen === 'teams' && (
            <div className="flex-1 flex flex-col animate-fade-in-up">
              {/* Balance meter metrics */}
              <div className="bg-[#1A1A1A]/85 rounded-2xl p-4 mb-3 border border-white/5 shadow-lg">
                <div className="text-center text-xs text-white/50 mb-2 uppercase font-title font-bold tracking-widest">
                  Fuerza Equilibrada de Equipos
                </div>
                <div className="grid grid-cols-2 gap-4 divide-x divide-white/10 text-center">
                  <div>
                    <div className="text-xs text-white/60 font-medium">⚪ Blancos</div>
                    <div className="text-2xl font-title font-bold text-white mt-0.5">
                      {allocation.blancos.reduce((s, p) => s + p.nivel, 0)}{' '}
                      <span className="text-xs font-sans text-gray-500 font-normal">pts</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {allocation.blancos.length} jugadores
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-red-300 font-medium">🔴 Rojos</div>
                    <div className="text-2xl font-title font-bold text-red-400 mt-0.5">
                      {allocation.rojos.reduce((s, p) => s + p.nivel, 0)}{' '}
                      <span className="text-xs font-sans text-gray-500 font-normal">pts</span>
                    </div>
                    <div className="text-[10px] text-red-300 mt-1">
                      {allocation.rojos.length} jugadores
                    </div>
                  </div>
                </div>
              </div>

              {/* Drag instruction notice bar */}
              <div className="flex items-center gap-1.5 justify-center py-1.5 px-3 bg-white/5 rounded-full mb-3 text-[11px] text-gray-300 font-sans italic">
                <Info size={12} className="text-[#FF6B35]" />
                <span>Mantén apretado y arrastra jugadores para intercambiarlos en tiempo real</span>
              </div>

              {/* Equips Flex container */}
              <div className="space-y-4 pb-20 pr-0.5">
                
                {/* WHITES ZONE (ZONE WHITE) */}
                <div 
                  data-zone="blancos"
                  onDragOver={(e) => { e.preventDefault(); setDragOverZone('blancos'); }}
                  onDragLeave={() => setDragOverZone(null)}
                  onDrop={() => handleDrop('blancos')}
                  className={`p-4 rounded-2xl transition-all duration-200 border-2 ${
                    dragOverZone === 'blancos' 
                      ? 'bg-emerald-500/10 border-dashed border-emerald-400 shadow-emerald-500/5' 
                      : 'bg-[#1A1A1A]/72 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2.5">
                    <span className="text-sm font-title font-bold tracking-wide uppercase text-white flex items-center gap-1.5">
                      <span>⚪ EQUIPO BLANCOS</span>
                    </span>
                    <span className="text-xs text-gray-400 font-title">
                      {allocation.blancos.length} / 7 jugadores
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[50px]">
                    {allocation.blancos.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-white/5 rounded-xl uppercase">Vacío - Suelta un jugador aquí</div>
                    ) : (
                      allocation.blancos.map(p => {
                        const cfg = POS_CONFIG[p.posicion];
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => handleDragStart(p.id, 'blancos', e)}
                            onTouchStart={() => handleTouchStart(p.id, 'blancos')}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className={`flex justify-between items-center bg-[#2C2C2C] p-2 px-3 rounded-xl border border-white/5 ${cfg.bg} active:opacity-60 cursor-grab hover:bg-[#333333] transition-all`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cfg.emoji}</span>
                              <span className="text-sm font-semibold text-white">{p.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[#F5C518]">
                              {'★'.repeat(p.nivel)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* REDS ZONE (ZONE RED) */}
                <div 
                  data-zone="rojos"
                  onDragOver={(e) => { e.preventDefault(); setDragOverZone('rojos'); }}
                  onDragLeave={() => setDragOverZone(null)}
                  onDrop={() => handleDrop('rojos')}
                  className={`p-4 rounded-2xl transition-all duration-200 border-2 ${
                    dragOverZone === 'rojos' 
                      ? 'bg-red-500/10 border-dashed border-[#FF5252] shadow-red-500/5' 
                      : 'bg-[#1A1A1A]/72 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2.5">
                    <span className="text-sm font-title font-bold tracking-wide uppercase text-red-400 flex items-center gap-1.5">
                      <span>🔴 EQUIPO ROJOS</span>
                    </span>
                    <span className="text-xs text-red-300 font-title">
                      {allocation.rojos.length} / 7 jugadores
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[50px]">
                    {allocation.rojos.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-white/5 rounded-xl uppercase">Vacío - Suelta un jugador aquí</div>
                    ) : (
                      allocation.rojos.map(p => {
                        const cfg = POS_CONFIG[p.posicion];
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => handleDragStart(p.id, 'rojos', e)}
                            onTouchStart={() => handleTouchStart(p.id, 'rojos')}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className={`flex justify-between items-center bg-[#2C2C2C] p-2 px-3 rounded-xl border border-white/5 ${cfg.bg} active:opacity-60 cursor-grab hover:bg-[#333333] transition-all`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cfg.emoji}</span>
                              <span className="text-sm font-semibold text-white">{p.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[#F5C518]">
                              {'★'.repeat(p.nivel)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* SUPLENTES POOL ZONE */}
                <div 
                  data-zone="suplentes"
                  onDragOver={(e) => { e.preventDefault(); setDragOverZone('suplentes'); }}
                  onDragLeave={() => setDragOverZone(null)}
                  onDrop={() => handleDrop('suplentes')}
                  className={`p-4 rounded-2xl transition-all duration-200 border-2 ${
                    dragOverZone === 'suplentes' 
                      ? 'bg-amber-500/10 border-dashed border-amber-400 shadow-amber-500/5' 
                      : 'bg-black/40 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2.5">
                    <span className="text-sm font-title font-bold tracking-wide uppercase text-amber-500 flex items-center gap-1.5">
                      <span>🔄 SUPLENTES / extras</span>
                    </span>
                    <span className="text-xs text-gray-400 font-title">
                      {allocation.suplentes.length} suplentes
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[50px]">
                    {allocation.suplentes.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-600 border border-dashed border-white/5 rounded-xl uppercase">No hay suplentes hoy</div>
                    ) : (
                      allocation.suplentes.map(p => {
                        const cfg = POS_CONFIG[p.posicion];
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => handleDragStart(p.id, 'suplentes', e)}
                            onTouchStart={() => handleTouchStart(p.id, 'suplentes')}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className={`flex justify-between items-center bg-[#2C2C2C] p-2 px-3 rounded-xl border border-white/5 ${cfg.bg} active:opacity-60 cursor-grab hover:bg-[#333333] transition-all`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cfg.emoji}</span>
                              <span className="text-sm font-semibold text-white">{p.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[#F5C518]">
                              {'★'.repeat(p.nivel)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Action Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#1A1A1A]/90 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => setScreen('convocate')}
                  className="px-4 py-3.5 text-sm uppercase font-title font-bold text-gray-300 hover:text-white border border-white/20 rounded-full cursor-pointer hover:bg-white/5 transition-all text-center"
                >
                  Cambiar Convocados
                </button>
                <button 
                  onClick={handleShareWhatsApp}
                  className="flex-1 py-3.5 rounded-full font-title font-bold text-base tracking-wider uppercase bg-[#FF6B35] text-white shadow-lg active:scale-98 transition-all hover:bg-[#FF8855] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 size={18} />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          )}

        </main>

        {/* DIALOG FOR MOCK EXPORTER Standalone code to run offline */}
        {isExportOpen && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col justify-start p-6 animate-fade-in-up">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <h2 className="text-lg font-title font-bold text-white uppercase flex items-center gap-1.5">
                <Sparkles size={18} className="text-[#F5C518]" />
                <span>Exportar HTML Único</span>
              </h2>
              <button 
                onClick={() => setIsExportOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-xs text-gray-300 space-y-2 mb-4 leading-relaxed font-sans">
              <p>
                Esta función genera un archivo <strong>index.html autocontenido</strong> que incluye todos los jugadores creados de forma integrada.
              </p>
              <p>
                ¡Puedes copiarlo, guardarlo en tu computadora o enviarlo, y funcionará al 100% de forma offline en cualquier navegador de tu celular!
              </p>
            </div>

            <div className="relative flex-1 bg-[#1A1A1A]/95 rounded-xl border border-white/10 p-3 overflow-hidden flex flex-col">
              <div className="text-[10px] text-gray-500 font-mono flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                <span>ESTADO: LISTO PARA USAR</span>
                <span className="text-[#A3E635]">AUTOCONTENIDO (HTML + CSS + JS)</span>
              </div>
              <pre className="text-[10px] font-mono text-gray-400 overflow-auto flex-1 select-all no-scrollbar leading-tight bg-black/20 p-2 rounded-lg">
                {getVanillaCodeString(jugadores)}
              </pre>
            </div>

            <button 
              onClick={handleCopyCode}
              className="mt-4 w-full py-3.5 rounded-full font-title font-bold uppercase bg-[#FF6B35] text-white flex items-center justify-center gap-2 hover:bg-[#FF8855] text-center cursor-pointer transition-all active:scale-98"
            >
              {copied ? (
                <>
                  <Check size={18} className="text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado con éxito!</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Copiar código HTML Único</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* MODAL WINDOW FOR ADDING & EDITING JUGADOR */}
        {isModalOpen && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#222222] w-full max-w-[340px] rounded-3xl border border-white/10 p-5 shadow-2xl animate-fade-in-up">
              <h2 className="text-lg font-title font-bold text-center border-b border-white/10 pb-3 mb-4 uppercase tracking-wide text-white">
                {editingId ? 'Editar Jugador ⚽' : 'Agregar Jugador ➕'}
              </h2>

              <form onSubmit={handleSavePlayer} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-title font-semibold text-gray-400 tracking-wider">
                    Nombre del Jugador
                  </label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Rodrigo"
                    className="w-full bg-[#2C2C2C] border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#FF6B35] transition-all font-sans"
                  />
                </div>

                {/* Position selector */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-title font-semibold text-gray-400 tracking-wider">
                    Posición en la Cancha
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(POS_CONFIG) as Posicion[]).map(pos => {
                      const isSelected = formPos === pos;
                      const cfg = POS_CONFIG[pos];
                      return (
                        <button
                          type="button"
                          key={pos}
                          onClick={() => setFormPos(pos)}
                          className={`flex items-center gap-1.5 justify-center py-2 px-1 text-xs font-medium font-sans rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#FF6B35]/20 border-[#FF6B35] text-white shadow-md' 
                              : 'bg-[#2C2C2C] border-white/5 text-gray-300 hover:border-white/10'
                          }`}
                        >
                          <span className="text-base">{cfg.emoji}</span>
                          <span>{cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rating Level stars editor */}
                <div className="space-y-1.5 text-center">
                  <label className="text-xs uppercase font-title font-semibold text-gray-400 tracking-wider block">
                    Nivel de Juego (Habilidad)
                  </label>
                  <div className="flex justify-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map(val => {
                      const isActive = val <= formNivel;
                      return (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setFormNivel(val)}
                          className="p-1 focus:outline-none cursor-pointer hover:scale-110 active:scale-95 transition-all"
                        >
                          <Star 
                            size={28} 
                            className={`transition-all ${
                              isActive ? 'fill-[#F5C518] text-[#F5C518]' : 'text-white/20'
                            }`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cancel / Save actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-white/20 hover:bg-white/5 text-gray-300 rounded-full font-title font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#FF6B35] text-white rounded-full font-title font-bold text-xs uppercase tracking-wider hover:bg-[#FF8855] text-center cursor-pointer transition-all active:scale-95 shadow-md shadow-[#FF6B35]/15"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL WINDOW FOR DELETION CONFIRMATION */}
        {deleteConfirmPlayer && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#222222] w-full max-w-[320px] rounded-3xl border border-white/10 p-5 shadow-2xl animate-fade-in-up text-center">
              <span className="text-4xl block mb-2">🗑️</span>
              <h2 className="text-lg font-title font-bold uppercase tracking-wide text-white mb-2">
                ¿Eliminar jugador?
              </h2>
              <p className="text-sm text-gray-300 font-sans mb-5 leading-snug">
                ¿Estás seguro de que deseas eliminar a <strong className="text-white">{deleteConfirmPlayer.nombre}</strong> de la base de datos? Esta acción es permanente.
              </p>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPlayer(null)}
                  className="flex-1 py-2.5 border border-white/20 hover:bg-white/5 text-gray-300 rounded-full font-title font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = deleteConfirmPlayer.id;
                    const updated = jugadores.filter(j => j.id !== id);
                    updatePlayersState(updated);
                    
                    const newConvocados = new Set(convocados);
                    newConvocados.delete(id);
                    setConvocados(newConvocados);
                    
                    setDeleteConfirmPlayer(null);
                  }}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-full font-title font-bold text-xs uppercase tracking-wider hover:bg-red-600 text-center cursor-pointer transition-all active:scale-95 shadow-md shadow-red-500/15"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
