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
import { db } from '@/lib/firebase';
import { GameRoom, Player, GameSettings, GameStatus } from '@/types/game';

export class GameRoomService {
  private static readonly COLLECTION_NAME = 'gameRooms';

  // Generate a unique 6-character game code
  static generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create a new game room
  static async createRoom(
    hostId: string, 
    hostName: string, 
    roomName: string,
    settings: Partial<GameSettings> = {}
  ): Promise<string> {
    const defaultSettings: GameSettings = {
      allowSpectators: true,
      chatEnabled: true,
      timeLimit: 60,
      difficultyLevel: 'normal',
      ...settings
    };

    const host: Player = {
      id: hostId,
      name: hostName,
      isHost: true,
      joinedAt: new Date(),
      isReady: false
    };

    const gameRoom: Omit<GameRoom, 'id'> = {
      name: roomName,
      hostId,
      players: [host],
      maxPlayers: 10,
      minPlayers: 5,
      status: 'waiting',
      createdAt: new Date(),
      gameCode: this.generateGameCode(),
      settings: defaultSettings
    };

    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...gameRoom,
        createdAt: Timestamp.fromDate(gameRoom.createdAt),
        players: gameRoom.players.map(p => ({
          ...p,
          joinedAt: Timestamp.fromDate(p.joinedAt)
        }))
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating game room:', error);
      throw error;
    }
  }

  // Join an existing game room
  static async joinRoom(roomId: string, playerId: string, playerName: string): Promise<boolean> {
    try {
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Game room not found');
      }

      const roomData = roomSnap.data() as GameRoom;
      
      // Check if room is full
      if (roomData.players.length >= roomData.maxPlayers) {
        throw new Error('Game room is full');
      }

      // Check if player is already in room
      if (roomData.players.some(p => p.id === playerId)) {
        throw new Error('Player already in room');
      }

      // Check if game has started
      if (roomData.status !== 'waiting' && roomData.status !== 'ready') {
        throw new Error('Game has already started');
      }

      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isHost: false,
        joinedAt: new Date(),
        isReady: false
      };

      await updateDoc(roomRef, {
        players: arrayUnion({
          ...newPlayer,
          joinedAt: Timestamp.fromDate(newPlayer.joinedAt)
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
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
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
                ...p,
                joinedAt: p.joinedAt instanceof Date ? Timestamp.fromDate(p.joinedAt) : p.joinedAt
              }))
            });
          }
        }
      } else {
        // Remove player from room
        await updateDoc(roomRef, {
          players: arrayRemove({
            ...playerToRemove,
            joinedAt: playerToRemove.joinedAt instanceof Date 
              ? Timestamp.fromDate(playerToRemove.joinedAt) 
              : playerToRemove.joinedAt
          })
        });
      }
    } catch (error) {
      console.error('Error leaving game room:', error);
      throw error;
    }
  }

  // Get a specific game room
  static async getRoom(roomId: string): Promise<GameRoom | null> {
    try {
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
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
        collection(db, this.COLLECTION_NAME),
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
        collection(db, this.COLLECTION_NAME),
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
    const roomRef = doc(db, this.COLLECTION_NAME, roomId);
    
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
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
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
          ...p,
          joinedAt: p.joinedAt instanceof Date ? Timestamp.fromDate(p.joinedAt) : p.joinedAt
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
      const roomRef = doc(db, this.COLLECTION_NAME, roomId);
      await updateDoc(roomRef, { status });
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  }
}
