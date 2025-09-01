'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GameRoom } from '@/types/game';
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
      <div style={{ 
        minHeight: "50vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center"
      }}>
        <div style={{ 
          fontSize: "1.25rem", 
          color: "var(--secondary)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <div style={{
            width: "1.5rem",
            height: "1.5rem",
            border: "2px solid var(--primary)",
            borderTop: "2px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }}></div>
          Loading room...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {error && (
        <div style={{
          background: "var(--error)",
          color: "white",
          padding: "1rem 1.5rem",
          borderRadius: "8px",
          fontWeight: "500"
        }}>
          {error}
        </div>
      )}

      {/* Room Header */}
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 style={{ 
              fontSize: "1.875rem", 
              fontWeight: "800", 
              color: "var(--foreground)", 
              marginBottom: "0.5rem" 
            }}>
              {room.name}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <span style={{ fontSize: "0.875rem", color: "var(--secondary)" }}>Game Code:</span>
                <button
                  onClick={copyGameCode}
                  style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    color: "var(--primary)",
                    border: `1px solid var(--primary)`,
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    background: "var(--background)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  title="Click to copy"
                  onMouseOver={(e) => {
                    (e.target as HTMLButtonElement).style.background = "var(--primary)";
                    (e.target as HTMLButtonElement).style.color = "white";
                  }}
                  onMouseOut={(e) => {
                    (e.target as HTMLButtonElement).style.background = "var(--background)";
                    (e.target as HTMLButtonElement).style.color = "var(--primary)";
                  }}
                >
                  {room.gameCode}
                </button>
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--secondary)" }}>
                Players: {room.players.length}/{room.maxPlayers}
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--secondary)" }}>
                Status: <span style={{ textTransform: "capitalize", fontWeight: "600" }}>{room.status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            disabled={loading}
            className="btn btn-error"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Game Rules Reminder */}
      <div style={{
        background: "var(--surface)",
        border: `1px solid var(--border)`,
        padding: "1rem",
        borderRadius: "8px"
      }}>
        <h3 style={{ 
          fontWeight: "600", 
          color: "var(--primary)", 
          marginBottom: "0.5rem" 
        }}>
          Game Requirements
        </h3>
        <ul style={{ 
          fontSize: "0.875rem", 
          color: "var(--foreground)",
          listStyle: "none",
          padding: 0,
          margin: 0
        }}>
          <li style={{ marginBottom: "0.25rem" }}>• Minimum {room.minPlayers} players required to start</li>
          <li style={{ marginBottom: "0.25rem" }}>• All players must be ready before the game can begin</li>
          <li>• The host can start the game when ready</li>
        </ul>
      </div>

      {/* Players List */}
      <div className="card">
        <h2 style={{ 
          fontSize: "1.25rem", 
          fontWeight: "700", 
          color: "var(--foreground)", 
          marginBottom: "1rem" 
        }}>
          Players
        </h2>
        <div className="space-y-3" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {room.players.map((player) => (
            <div
              key={player.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem",
                borderRadius: "8px",
                border: `1px solid ${player.isReady ? 'var(--success)' : 'var(--border)'}`,
                background: player.isReady ? 'var(--surface-hover)' : 'var(--surface)'
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "0.75rem",
                  height: "0.75rem",
                  borderRadius: "50%",
                  background: player.isReady ? 'var(--success)' : 'var(--secondary)'
                }} />
                <span style={{ fontWeight: "600", color: "var(--foreground)" }}>{player.name}</span>
                {player.isHost && (
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    background: "var(--warning)",
                    color: "white",
                    fontSize: "0.75rem",
                    borderRadius: "9999px",
                    fontWeight: "600"
                  }}>
                    Host
                  </span>
                )}
                {player.id === user.uid && (
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    background: "var(--accent)",
                    color: "white",
                    fontSize: "0.75rem",
                    borderRadius: "9999px",
                    fontWeight: "600"
                  }}>
                    You
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--secondary)" }}>
                {player.isReady ? 'Ready' : 'Not Ready'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            {currentPlayer && (
              <button
                onClick={handleToggleReady}
                disabled={loading}
                className={`btn ${currentPlayer.isReady ? 'btn-warning' : 'btn-success'}`}
              >
                {loading ? 'Updating...' : currentPlayer.isReady ? 'Not Ready' : 'Ready Up'}
              </button>
            )}
          </div>

          {isHost && (
            <div style={{ textAlign: "right" }}>
              <div style={{ 
                fontSize: "0.875rem", 
                color: "var(--secondary)", 
                marginBottom: "0.5rem" 
              }}>
                {canStartGame 
                  ? 'All players ready! You can start the game.' 
                  : `Need ${room.minPlayers - room.players.length} more players and all players ready.`
                }
              </div>
              <button
                onClick={handleStartGame}
                disabled={loading || !canStartGame}
                className="btn btn-primary"
                style={{ fontSize: "1rem", padding: "0.75rem 1.5rem" }}
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
