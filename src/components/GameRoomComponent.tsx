'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GameRoom, Player } from '@/types/game';
import { GameRoomService } from '@/services/gameRoomService';

interface GameRoomComponentProps {
  user: User;
  roomId: string;
  onLeaveRoom: () => void;
  onStartGame: () => void;
}

export default function GameRoomComponent({ user, roomId, onLeaveRoom, onStartGame }: GameRoomComponentProps) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = GameRoomService.subscribeToRoom(roomId, (updatedRoom) => {
      if (updatedRoom) {
        setRoom(updatedRoom);
        // If game has started, transition to game view
        if (updatedRoom.status === 'starting' || updatedRoom.status === 'in_progress') {
          onStartGame();
        }
      } else {
        // Room was deleted
        setError('Room no longer exists');
        setTimeout(onLeaveRoom, 2000);
      }
    });

    return () => unsubscribe();
  }, [roomId, onLeaveRoom, onStartGame]);

  const currentPlayer = room?.players.find(p => p.id === user.uid);
  const isHost = currentPlayer?.isHost || false;
  const canStartGame = room && room.players.length >= room.minPlayers && room.players.every(p => p.isReady);

  const handleToggleReady = async () => {
    if (!room || !currentPlayer) return;

    setLoading(true);
    try {
      await GameRoomService.setPlayerReady(roomId, user.uid, !currentPlayer.isReady);
    } catch (error) {
      console.error('Error toggling ready status:', error);
      setError('Failed to update ready status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || !isHost || !canStartGame) return;

    setLoading(true);
    try {
      await GameRoomService.updateRoomStatus(roomId, 'starting');
      // Game initialization logic will be handled elsewhere
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    setLoading(true);
    try {
      await GameRoomService.leaveRoom(roomId, user.uid);
      onLeaveRoom();
    } catch (error) {
      console.error('Error leaving room:', error);
      setError('Failed to leave room');
    } finally {
      setLoading(false);
    }
  };

  const copyGameCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.gameCode);
      // You could add a toast notification here
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Room Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Game Code:</span>
                <button
                  onClick={copyGameCode}
                  className="font-mono text-lg font-bold text-blue-600 hover:text-blue-800 border border-blue-300 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                  title="Click to copy"
                >
                  {room.gameCode}
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Players: {room.players.length}/{room.maxPlayers}
              </div>
              <div className="text-sm text-gray-600">
                Status: <span className="capitalize font-medium">{room.status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Game Rules Reminder */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Game Requirements</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Minimum {room.minPlayers} players required to start</li>
          <li>• All players must be ready before the game can begin</li>
          <li>• The host can start the game when ready</li>
        </ul>
      </div>

      {/* Players List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Players</h2>
        <div className="space-y-3">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                player.isReady ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  player.isReady ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="font-medium">{player.name}</span>
                {player.isHost && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Host
                  </span>
                )}
                {player.id === user.uid && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    You
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {player.isReady ? 'Ready' : 'Not Ready'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            {currentPlayer && (
              <button
                onClick={handleToggleReady}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  currentPlayer.isReady
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {loading ? 'Updating...' : currentPlayer.isReady ? 'Not Ready' : 'Ready Up'}
              </button>
            )}
          </div>

          {isHost && (
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-2">
                {canStartGame 
                  ? 'All players ready! You can start the game.' 
                  : `Need ${room.minPlayers - room.players.length} more players and all players ready.`
                }
              </div>
              <button
                onClick={handleStartGame}
                disabled={loading || !canStartGame}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Starting...' : 'Start Game'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
