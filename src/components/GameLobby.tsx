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
        <h1 style={{ 
          fontSize: "2.5rem", 
          fontWeight: "800", 
          color: "var(--foreground)", 
          marginBottom: "0.5rem",
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          Game Lobby
        </h1>
        <p style={{ color: "var(--secondary)", fontSize: "1.125rem" }}>
          Join a game or create your own room
        </p>
      </div>

      {error && (
        <div style={{
          background: "var(--error)",
          color: "white",
          padding: "1rem 1.5rem",
          borderRadius: "8px",
          border: "none",
          fontWeight: "500"
        }}>
          {error}
        </div>
      )}

      {/* Player Name Input */}
      <div className="card">
        <label htmlFor="playerName" style={{ 
          display: "block", 
          fontSize: "0.875rem", 
          fontWeight: "600", 
          color: "var(--foreground)", 
          marginBottom: "0.5rem" 
        }}>
          Your Name
        </label>
        <input
          type="text"
          id="playerName"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="input"
          placeholder="Enter your name"
          maxLength={20}
        />
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "2rem" 
      }} className="grid-responsive">
        {/* Create Room */}
        <div className="card">
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            color: "var(--foreground)", 
            marginBottom: "1rem" 
          }}>
            Create New Game
          </h2>
          <form onSubmit={handleCreateRoom}>
            <div className="mb-4">
              <label htmlFor="roomName" style={{ 
                display: "block", 
                fontSize: "0.875rem", 
                fontWeight: "600", 
                color: "var(--foreground)", 
                marginBottom: "0.5rem" 
              }}>
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="input"
                placeholder="Enter room name"
                maxLength={30}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !roomName.trim() || !playerName.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>

        {/* Join with Code */}
        <div className="card">
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            color: "var(--foreground)", 
            marginBottom: "1rem" 
          }}>
            Join with Game Code
          </h2>
          <form onSubmit={handleJoinWithCode}>
            <div className="mb-4">
              <label htmlFor="gameCode" style={{ 
                display: "block", 
                fontSize: "0.875rem", 
                fontWeight: "600", 
                color: "var(--foreground)", 
                marginBottom: "0.5rem" 
              }}>
                Game Code
              </label>
              <input
                type="text"
                id="gameCode"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="input"
                style={{ 
                  fontFamily: "var(--font-geist-mono, monospace)", 
                  textAlign: "center", 
                  fontSize: "1.125rem", 
                  letterSpacing: "0.1em" 
                }}
                placeholder="ABCD12"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !gameCode.trim() || !playerName.trim()}
              className="btn btn-success w-full"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>

      {/* Available Rooms */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            color: "var(--foreground)" 
          }}>
            Available Games
          </h2>
          <button
            onClick={loadAvailableRooms}
            style={{
              padding: "0.5rem 1rem",
              color: "var(--primary)",
              background: "transparent",
              border: "1px solid var(--primary)",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontWeight: "500"
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = "var(--primary)";
              (e.target as HTMLButtonElement).style.color = "white";
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.color = "var(--primary)";
            }}
          >
            Refresh
          </button>
        </div>

        {availableRooms.length === 0 ? (
          <p style={{ 
            color: "var(--secondary)", 
            textAlign: "center", 
            padding: "2rem 0",
            fontSize: "1rem"
          }}>
            No games available. Create one!
          </p>
        ) : (
          <div className="space-y-2">
            {availableRooms.map((room) => (
              <div 
                key={room.id} 
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  background: "var(--surface)",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--surface-hover)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--surface)";
                }}
              >
                <div>
                  <h3 style={{ fontWeight: "600", color: "var(--foreground)", marginBottom: "0.25rem" }}>
                    {room.name}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--secondary)", marginBottom: "0.25rem" }}>
                    {room.players.length}/{room.maxPlayers} players • Code: {room.gameCode}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--secondary)" }}>
                    Host: {room.players.find(p => p.isHost)?.name}
                  </p>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={loading || !playerName.trim() || room.players.length >= room.maxPlayers}
                  className="btn btn-primary"
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
