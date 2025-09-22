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
  const [confirmKick, setConfirmKick] = useState<string | null>(null); // player ID to kick
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyCodeMessage, setCopyCodeMessage] = useState<string | null>(null);
  const [copyLinkMessage, setCopyLinkMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = GameRoomService.subscribeToRoom(roomId, (updatedRoom) => {
      if (updatedRoom) {
        // Check if current user is still in the room (might have been kicked)
        const userStillInRoom = updatedRoom.players.some(p => p.id === user.uid);
        
        if (!userStillInRoom) {
          // User was kicked or removed
          setError('You have been removed from the room');
          setTimeout(onLeaveRoom, 2000);
          return;
        }

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
  }, [roomId, onLeaveRoom, onStartGame, user.uid]);

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

    const copyGameCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.gameCode);
      setCopyCodeMessage('Game code copied!');
      setTimeout(() => setCopyCodeMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy game code:', err);
    }
  };

  const copyShareableLink = async () => {
    if (!room) return;
    try {
      const shareableLink = `${window.location.origin}/join?code=${room.gameCode}`;
      await navigator.clipboard.writeText(shareableLink);
      setCopyLinkMessage('Link copied!');
      setTimeout(() => setCopyLinkMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy shareable link:', err);
    }
  };

  const handleKickPlayer = async (playerIdToKick: string) => {
    if (!room) return;
    
    setLoading(true);
    try {
      await GameRoomService.kickPlayer(roomId, user.uid, playerIdToKick);
      setConfirmKick(null);
    } catch (error: any) {
      console.error('Error kicking player:', error);
      setError(error.message || 'Failed to kick player');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    
    setLoading(true);
    try {
      await GameRoomService.deleteRoom(roomId, user.uid);
      setConfirmDelete(false);
      onLeaveRoom(); // Navigate back to lobby
    } catch (error: any) {
      console.error('Error deleting room:', error);
      setError(error.message || 'Failed to delete room');
    } finally {
      setLoading(false);
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
    <div style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem 1.5rem",
      display: "flex",
      flexDirection: "column",
      gap: "2rem"
    }}>
      {error && (
        <div style={{
          background: "var(--error)",
          color: "white",
          padding: "1.25rem 1.5rem",
          borderRadius: "12px",
          fontWeight: "500",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)"
        }}>
          {error}
        </div>
      )}

      {/* Room Header */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 4px 12px var(--shadow)"
      }}>
        {/* Header with room name and leave button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ 
            fontSize: "1.75rem", 
            fontWeight: "700", 
            color: "var(--foreground)", 
            margin: 0,
            lineHeight: "1.2"
          }}>
            {room.name}
          </h1>
          <button
            onClick={handleLeaveRoom}
            disabled={loading}
            className="btn btn-error"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
          >
            Leave Room
          </button>
        </div>

        {/* Game Info Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem"
        }}>
          {/* Game Code Card */}
          <div style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "1rem",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.75rem", color: "var(--secondary)", marginBottom: "0.5rem", fontWeight: "600" }}>
              Game Code
            </div>
            <button
              onClick={copyGameCode}
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "1.25rem",
                fontWeight: "800",
                color: "var(--primary)",
                border: "2px solid var(--primary)",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.05em",
                width: "100%",
                position: "relative"
              }}
              title="Click to copy game code"
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.background = "var(--primary)";
                (e.target as HTMLButtonElement).style.color = "white";
                (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.color = "var(--primary)";
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {room.gameCode}
            </button>
            {copyCodeMessage && (
              <div style={{ 
                fontSize: "0.7rem", 
                color: "var(--success)", 
                fontWeight: "600", 
                marginTop: "0.25rem"
              }}>
                ✓ {copyCodeMessage}
              </div>
            )}
          </div>

          {/* Players Count Card */}
          <div style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "1rem",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.75rem", color: "var(--secondary)", marginBottom: "0.5rem", fontWeight: "600" }}>
              Players
            </div>
            <div style={{ 
              fontSize: "1.25rem", 
              fontWeight: "800", 
              color: "var(--foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.125rem",
              marginBottom: "0.25rem"
            }}>
              <span style={{ color: room.players.length >= room.minPlayers ? "var(--success)" : "var(--warning)" }}>
                {room.players.length}
              </span>
              <span style={{ color: "var(--secondary)", fontSize: "1rem" }}>
                /{room.maxPlayers}
              </span>
            </div>
            <div style={{ 
              fontSize: "0.7rem", 
              color: room.players.length >= room.minPlayers ? "var(--success)" : "var(--warning)", 
              fontWeight: "600"
            }}>
              {room.players.length >= room.minPlayers ? "Ready to start" : `Need ${room.minPlayers - room.players.length} more`}
            </div>
          </div>
        </div>

        {/* Share Link Section */}
        <div style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.75rem"
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--secondary)", marginBottom: "0.5rem", fontWeight: "600" }}>
            Share Link
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={copyShareableLink}
              style={{
                flex: 1,
                minWidth: "200px",
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "0.8rem",
                color: "var(--secondary)",
                border: `1px solid var(--border)`,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                background: "var(--background)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title="Click to copy shareable link"
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.background = "var(--surface)";
                (e.target as HTMLButtonElement).style.borderColor = "var(--primary)";
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.background = "var(--background)";
                (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
              }}
            >
              {typeof window !== 'undefined' ? `${window.location.origin}/join?code=${room.gameCode}` : `Join with code: ${room.gameCode}`}
            </button>
            {copyLinkMessage && (
              <div style={{ 
                fontSize: "0.75rem", 
                color: "var(--success)", 
                fontWeight: "600",
                whiteSpace: "nowrap"
              }}>
                ✓ {copyLinkMessage}
              </div>
            )}
          </div>
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
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem"
        }}>
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            color: "var(--foreground)", 
            margin: 0
          }}>
            Players
          </h2>
          <div style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            textTransform: "capitalize",
            color: room.status === 'waiting' ? "var(--warning)" : room.status === 'in_progress' ? "var(--success)" : "var(--secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: room.status === 'waiting' ? "var(--warning)" : room.status === 'in_progress' ? "var(--success)" : "var(--secondary)",
              animation: room.status === 'waiting' ? "pulse 2s infinite" : "none"
            }}></div>
            {room.status === 'waiting' ? 'Waiting' : room.status}
          </div>
        </div>
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
                {player.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={player.photoURL} 
                    alt={`${player.name}'s profile`}
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      border: `2px solid ${player.isReady ? 'var(--success)' : 'var(--secondary)'}`
                    }}
                  />
                ) : (
                  <div style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: player.isReady ? 'var(--success)' : 'var(--secondary)',
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "0.875rem"
                  }}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", flex: 1 }}>
                  <span style={{ fontWeight: "600", color: "var(--foreground)" }}>{player.name}</span>
                  {player.displayName && player.name !== player.displayName && (
                    <span style={{ fontSize: "0.75rem", color: "var(--secondary)" }}>
                      ({player.displayName})
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                  {/* Kick button for host */}
                  {isHost && player.id !== user.uid && !player.isHost && (
                    <button
                      onClick={() => setConfirmKick(player.id)}
                      style={{
                        background: "var(--error)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: "500"
                      }}
                      disabled={loading}
                    >
                      Kick
                    </button>
                  )}
                </div>
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
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={loading}
                  className="btn btn-error"
                  style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
                >
                  Delete Room
                </button>
                <button
                  onClick={handleStartGame}
                  disabled={loading || !canStartGame}
                  className="btn btn-primary"
                  style={{ fontSize: "1rem", padding: "0.75rem 1.5rem" }}
                >
                  {loading ? 'Starting...' : 'Start Game'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      {confirmKick && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: "400px", margin: "1rem" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--foreground)" }}>
              Kick Player
            </h3>
            <p style={{ marginBottom: "1.5rem", color: "var(--secondary)" }}>
              Are you sure you want to kick {room?.players.find(p => p.id === confirmKick)?.name}? 
              They will be immediately removed from the game.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmKick(null)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleKickPlayer(confirmKick)}
                className="btn btn-error"
                disabled={loading}
              >
                {loading ? 'Kicking...' : 'Kick Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: "400px", margin: "1rem" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--foreground)" }}>
              Delete Room
            </h3>
            <p style={{ marginBottom: "1.5rem", color: "var(--secondary)" }}>
              Are you sure you want to delete this room? This action cannot be undone and will 
              remove all players from the game.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                className="btn btn-error"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
