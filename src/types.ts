export type Posicion = 'arquero' | 'defensa' | 'mediocampista' | 'delantero';

export interface Jugador {
  id: string;
  nombre: string;
  posicion: Posicion;
  nivel: number; // 1 a 5
}

export type Screen = 'list' | 'convocate' | 'teams';

export interface TeamAllocation {
  blancos: Jugador[];
  rojos: Jugador[];
  suplentes: Jugador[];
}
