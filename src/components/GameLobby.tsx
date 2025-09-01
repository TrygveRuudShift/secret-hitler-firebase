'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GameRoom } from '@/types/game';
import { GameRoomService } from '@/services/gameRoomService';

interface GameLobbyProps {
  user: User;
  onJoinRoom: (roomId: string) => void;
}

export default function GameLobby({ user, onJoinRoom }: GameLobbyProps) {
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joiningWithCode, setJoiningWithCode] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableRooms();
  }, []);

  const loadAvailableRooms = async () => {
    try {
      const rooms = await GameRoomService.getAvailableRooms();
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
      setError('Failed to load available rooms');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !playerName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const roomId = await GameRoomService.createRoom(
        user.uid,
        playerName.trim(),
        roomName.trim()
      );
      onJoinRoom(roomId);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await GameRoomService.joinRoom(roomId, user.uid, playerName.trim());
      onJoinRoom(roomId);
    } catch (error: any) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameCode.trim() || !playerName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const room = await GameRoomService.findRoomByCode(gameCode.trim());
      if (!room) {
        setError('Game not found with that code');
        return;
      }
      await GameRoomService.joinRoom(room.id, user.uid, playerName.trim());
      onJoinRoom(room.id);
    } catch (error: any) {
      console.error('Error joining with code:', error);
      setError(error.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Secret Hitler</h1>
        <p className="text-gray-600">Join a game or create your own room</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Player Name Input */}
      <div className="bg-white p-6 rounded-lg shadow">
        <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
          Your Name
        </label>
        <input
          type="text"
          id="playerName"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your name"
          maxLength={20}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Create Room */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Game</h2>
          <form onSubmit={handleCreateRoom}>
            <div className="mb-4">
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter room name"
                maxLength={30}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !roomName.trim() || !playerName.trim()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>

        {/* Join with Code */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Join with Game Code</h2>
          <form onSubmit={handleJoinWithCode}>
            <div className="mb-4">
              <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 mb-2">
                Game Code
              </label>
              <input
                type="text"
                id="gameCode"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-center text-lg"
                placeholder="ABCD12"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !gameCode.trim() || !playerName.trim()}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>

      {/* Available Rooms */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Available Games</h2>
          <button
            onClick={loadAvailableRooms}
            className="px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {availableRooms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No games available. Create one!</p>
        ) : (
          <div className="space-y-2">
            {availableRooms.map((room) => (
              <div key={room.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <h3 className="font-medium">{room.name}</h3>
                  <p className="text-sm text-gray-600">
                    {room.players.length}/{room.maxPlayers} players • Code: {room.gameCode}
                  </p>
                  <p className="text-xs text-gray-500">
                    Host: {room.players.find(p => p.isHost)?.name}
                  </p>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={loading || !playerName.trim() || room.players.length >= room.maxPlayers}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
