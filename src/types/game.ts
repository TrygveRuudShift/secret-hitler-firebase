export interface Player {
  id: string;
  name: string;
  displayName?: string; // From Google account or other providers
  email?: string; // From authenticated accounts
  photoURL?: string; // Profile picture from providers
  isHost: boolean;
  joinedAt: Date;
  isReady: boolean;
  avatar?: string;
  isAnonymous?: boolean; // Track if using anonymous auth
}

export interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  status: GameStatus;
  createdAt: Date;
  gameCode: string;
  settings: GameSettings;
}

export interface GameSettings {
  allowSpectators: boolean;
  chatEnabled: boolean;
  timeLimit: number; // seconds per turn
  difficultyLevel: 'easy' | 'normal' | 'hard';
}

export type GameStatus = 
  | 'waiting'      // Waiting for players to join
  | 'ready'        // Enough players, ready to start
  | 'starting'     // Game is starting (role assignment)
  | 'in_progress'  // Game is active
  | 'paused'       // Game is paused
  | 'finished'     // Game completed
  | 'cancelled';   // Game was cancelled

export interface GameState {
  roomId: string;
  currentPhase: GamePhase;
  round: number;
  turn: number;
  fascistPolicies: number;
  liberalPolicies: number;
  electionTracker: number;
  president: string | null;
  chancellor: string | null;
  lastGovernment: {
    president: string;
    chancellor: string;
  } | null;
  policyDeck: PolicyCard[];
  discardPile: PolicyCard[];
  playersAlive: string[];
  winner: 'fascist' | 'liberal' | null;
}

export type GamePhase = 
  | 'nomination'     // President nominates chancellor
  | 'election'       // Players vote on government
  | 'legislative'    // President and chancellor enact policy
  | 'executive'      // Presidential power execution
  | 'investigation'  // Presidential investigation power
  | 'special_election' // Special election power
  | 'assassination'  // Assassination power
  | 'game_over';     // Game finished

export type PolicyCard = 'fascist' | 'liberal';

export type Role = 'liberal' | 'fascist' | 'hitler';

export interface PlayerRole {
  playerId: string;
  role: Role;
  party: 'liberal' | 'fascist';
  isHitler: boolean;
}
