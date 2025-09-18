import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Timestamp 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { GameRoom, Player, GameSettings, GameStatus } from '@/types/game';

export class GameRoomService {
  private static readonly COLLECTION_NAME = 'gameRooms';

  // Check if Firebase is available
  private static isFirebaseAvailable(): boolean {
    return db !== null && db !== undefined;
  }

  // Helper to safely convert Date or Timestamp to Timestamp
  private static toTimestamp(dateOrTimestamp: Date | Timestamp): Timestamp {
    if (dateOrTimestamp instanceof Timestamp) {
      return dateOrTimestamp;
    }
    return Timestamp.fromDate(dateOrTimestamp);
  }

  // Helper to remove undefined values from objects (Firestore doesn't allow undefined)
  private static cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key as keyof T] = value;
      }
    }
    return cleaned;
  }

  // Generate a unique 6-character game code
  static generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper method to create a Player object from Firebase User
  static createPlayerFromUser(user: User, playerName: string, isHost: boolean = false): Player {
    return {
      id: user.uid,
      name: playerName,
      displayName: user.displayName || undefined,
      email: user.email || undefined,
      photoURL: user.photoURL || undefined,
      isHost,
      joinedAt: new Date(),
      isReady: false,
      isAnonymous: user.isAnonymous
    };
  }

  // Check if a player is already in any room
  static async findPlayerCurrentRoom(playerId: string): Promise<GameRoom | null> {
    if (!this.isFirebaseAvailable()) {
      return null;
    }

    try {
      const q = query(
        collection(db!, this.COLLECTION_NAME),
        where('players', 'array-contains-any', [{ id: playerId }])
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      // Return the first room found (player should only be in one room)
      const roomDoc = querySnapshot.docs[0];
      const roomData = roomDoc.data();
      
      return {
        id: roomDoc.id,
        ...roomData,
        createdAt: roomData.createdAt.toDate(),
        players: roomData.players.map((p: any) => ({
          ...p,
          joinedAt: p.joinedAt.toDate()
        }))
      } as GameRoom;
    } catch (error) {
      console.error('Error finding player current room:', error);
      return null;
    }
  }

  // Create a new game room
  static async createRoom(
    user: User, 
    playerName: string, 
    roomName: string,
    settings: Partial<GameSettings> = {}
  ): Promise<string> {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Firebase is not available');
    }

    const defaultSettings: GameSettings = {
      allowSpectators: true,
      chatEnabled: true,
      timeLimit: 60,
      difficultyLevel: 'normal',
      ...settings
    };

    const host: Player = this.createPlayerFromUser(user, playerName, true);

    const gameRoom: Omit<GameRoom, 'id'> = {
      name: roomName,
      hostId: user.uid,
      players: [host],
      maxPlayers: 10,
      minPlayers: 5,
      status: 'waiting',
      createdAt: new Date(),
      gameCode: this.generateGameCode(),
      settings: defaultSettings
    };

    try {
      const docRef = await addDoc(collection(db!, this.COLLECTION_NAME), {
        ...gameRoom,
        createdAt: this.toTimestamp(gameRoom.createdAt),
        players: gameRoom.players.map(p => ({
          ...this.cleanObject(p),
          joinedAt: this.toTimestamp(p.joinedAt)
        }))
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating game room:', error);
      throw error;
    }
  }

  // Join an existing game room
  static async joinRoom(roomId: string, user: User, playerName: string): Promise<boolean> {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Firebase is not available');
    }
    
    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Game room not found');
      }

      const roomData = roomSnap.data() as GameRoom;
      
      // Check if room is full (but allow existing players to rejoin)
      const existingPlayer = roomData.players.find(p => p.id === user.uid);
      if (!existingPlayer && roomData.players.length >= roomData.maxPlayers) {
        throw new Error('Game room is full');
      }

      // If player is already in room, allow them to rejoin (update their info)
      if (existingPlayer) {
        // Update existing player's information (name might have changed)
        const updatedPlayer: Player = this.createPlayerFromUser(user, playerName, existingPlayer.isHost);
        // Preserve some existing state
        updatedPlayer.isReady = existingPlayer.isReady;
        updatedPlayer.joinedAt = existingPlayer.joinedAt;

        // Remove old player data and add updated player data
        await updateDoc(roomRef, {
          players: arrayRemove({
            ...this.cleanObject(existingPlayer),
            joinedAt: this.toTimestamp(existingPlayer.joinedAt)
          })
        });

        await updateDoc(roomRef, {
          players: arrayUnion({
            ...this.cleanObject(updatedPlayer),
            joinedAt: this.toTimestamp(updatedPlayer.joinedAt)
          })
        });

        return true; // Successfully rejoined
      }

      // Check if game has started (only for new players)
      if (roomData.status !== 'waiting' && roomData.status !== 'ready') {
        throw new Error('Game has already started');
      }

      const newPlayer: Player = this.createPlayerFromUser(user, playerName, false);

      await updateDoc(roomRef, {
        players: arrayUnion({
          ...this.cleanObject(newPlayer),
          joinedAt: this.toTimestamp(newPlayer.joinedAt)
        })
      });

      return true;
    } catch (error) {
      console.error('Error joining game room:', error);
      throw error;
    }
  }

  // Leave a game room
  static async leaveRoom(roomId: string, playerId: string): Promise<void> {
    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        return;
      }

      const roomData = roomSnap.data() as GameRoom;
      const playerToRemove = roomData.players.find(p => p.id === playerId);
      
      if (!playerToRemove) {
        return;
      }

      // If host is leaving, either transfer host or delete room
      if (playerToRemove.isHost) {
        if (roomData.players.length === 1) {
          // Delete room if host is the only player
          await deleteDoc(roomRef);
          return;
        } else {
          // Transfer host to next player
          const newHost = roomData.players.find(p => p.id !== playerId);
          if (newHost) {
            const updatedPlayers = roomData.players.map(p => ({
              ...p,
              isHost: p.id === newHost.id
            })).filter(p => p.id !== playerId);

            await updateDoc(roomRef, {
              hostId: newHost.id,
              players: updatedPlayers.map(p => ({
                ...this.cleanObject(p),
                joinedAt: this.toTimestamp(p.joinedAt)
              }))
            });
          }
        }
      } else {
        // Remove player from room
        await updateDoc(roomRef, {
          players: arrayRemove({
            ...this.cleanObject(playerToRemove),
            joinedAt: this.toTimestamp(playerToRemove.joinedAt)
          })
        });
      }
    } catch (error) {
      console.error('Error leaving game room:', error);
      throw error;
    }
  }

  // Kick a player from the room (host only)
  static async kickPlayer(roomId: string, hostId: string, playerIdToKick: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Firebase is not available');
    }

    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Game room not found');
      }

      const roomData = roomSnap.data() as GameRoom;
      
      // Verify that the requester is the host
      if (roomData.hostId !== hostId) {
        throw new Error('Only the host can kick players');
      }

      // Cannot kick yourself
      if (hostId === playerIdToKick) {
        throw new Error('Host cannot kick themselves');
      }

      // Find the player to kick
      const playerToKick = roomData.players.find(p => p.id === playerIdToKick);
      if (!playerToKick) {
        throw new Error('Player not found in room');
      }

      // Remove the player
      await updateDoc(roomRef, {
        players: arrayRemove({
          ...this.cleanObject(playerToKick),
          joinedAt: this.toTimestamp(playerToKick.joinedAt)
        })
      });
    } catch (error) {
      console.error('Error kicking player:', error);
      throw error;
    }
  }

  // Delete the entire room (host only)
  static async deleteRoom(roomId: string, hostId: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      throw new Error('Firebase is not available');
    }

    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Game room not found');
      }

      const roomData = roomSnap.data() as GameRoom;
      
      // Verify that the requester is the host
      if (roomData.hostId !== hostId) {
        throw new Error('Only the host can delete the room');
      }

      // Can only delete room if game hasn't started
      if (roomData.status !== 'waiting' && roomData.status !== 'ready') {
        throw new Error('Cannot delete room after game has started');
      }

      // Delete the room
      await deleteDoc(roomRef);
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  // Get a specific game room
  static async getRoom(roomId: string): Promise<GameRoom | null> {
    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        return null;
      }

      const data = roomSnap.data();
      return {
        id: roomSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        players: data.players.map((p: any) => ({
          ...p,
          joinedAt: p.joinedAt.toDate()
        }))
      } as GameRoom;
    } catch (error) {
      console.error('Error getting game room:', error);
      throw error;
    }
  }

  // Find room by game code
  static async findRoomByCode(gameCode: string): Promise<GameRoom | null> {
    try {
      const q = query(
        collection(db!, this.COLLECTION_NAME),
        where('gameCode', '==', gameCode.toUpperCase())
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        players: data.players.map((p: any) => ({
          ...p,
          joinedAt: p.joinedAt.toDate()
        }))
      } as GameRoom;
    } catch (error) {
      console.error('Error finding room by code:', error);
      throw error;
    }
  }

  // Get all available rooms
  static async getAvailableRooms(): Promise<GameRoom[]> {
    try {
      // Use a simpler query to avoid index requirements
      const q = query(
        collection(db!, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      // Filter in JavaScript instead of in the query
      return querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            players: data.players.map((p: any) => ({
              ...p,
              joinedAt: p.joinedAt.toDate()
            }))
          } as GameRoom;
        })
        .filter(room => room.status === 'waiting' || room.status === 'ready');
    } catch (error) {
      console.error('Error getting available rooms:', error);
      throw error;
    }
  }

  // Subscribe to room changes
  static subscribeToRoom(roomId: string, callback: (room: GameRoom | null) => void) {
    const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
    
    return onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const room: GameRoom = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          players: data.players.map((p: any) => ({
            ...p,
            joinedAt: p.joinedAt.toDate()
          }))
        } as GameRoom;
        callback(room);
      } else {
        callback(null);
      }
    });
  }

  // Update player ready status
  static async setPlayerReady(roomId: string, playerId: string, isReady: boolean): Promise<void> {
    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const roomData = roomSnap.data() as GameRoom;
      const updatedPlayers = roomData.players.map(p => 
        p.id === playerId ? { ...p, isReady } : p
      );

      await updateDoc(roomRef, {
        players: updatedPlayers.map(p => ({
          ...this.cleanObject(p),
          joinedAt: this.toTimestamp(p.joinedAt)
        }))
      });

      // Check if all players are ready and update room status
      const allReady = updatedPlayers.every(p => p.isReady);
      const enoughPlayers = updatedPlayers.length >= roomData.minPlayers;
      
      if (allReady && enoughPlayers && roomData.status === 'waiting') {
        await updateDoc(roomRef, { status: 'ready' });
      } else if ((!allReady || !enoughPlayers) && roomData.status === 'ready') {
        await updateDoc(roomRef, { status: 'waiting' });
      }
    } catch (error) {
      console.error('Error setting player ready status:', error);
      throw error;
    }
  }

  // Update room status
  static async updateRoomStatus(roomId: string, status: GameStatus): Promise<void> {
    try {
      const roomRef = doc(db!, this.COLLECTION_NAME, roomId);
      await updateDoc(roomRef, { status });
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  }
}
