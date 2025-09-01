'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInAnonymously, signOut, User } from 'firebase/auth';
import GameLobby from '@/components/GameLobby';
import GameRoomComponent from '@/components/GameRoomComponent';

type AppState = 'loading' | 'lobby' | 'room' | 'game';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize auth listener if Firebase is available
    if (!auth) {
      setAppState('lobby');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setUser(user);
      if (user) {
        setAppState('lobby');
      } else {
        setAppState('lobby');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!auth) return;
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setAppState('lobby');
      setCurrentRoomId(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setAppState('room');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setAppState('lobby');
  };

  const handleStartGame = () => {
    setAppState('game');
  };

  if (appState === 'loading') {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{ 
          fontSize: "1.25rem", 
          color: "var(--secondary)" 
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Main Content */}
      <main style={{ flex: 1 }} className="py-8">
        {/* Back to Lobby Button (if not in lobby) */}
        {appState !== 'lobby' && (
          <div style={{ marginBottom: "1rem", padding: "0 1rem" }}>
            <div className="max-w-7xl mx-auto">
              <button
                onClick={handleLeaveRoom}
                style={{ 
                  color: "var(--primary)", 
                  fontWeight: "600",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  fontSize: "0.875rem"
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.color = "var(--primary-hover)";
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.color = "var(--primary)";
                }}
              >
                ← Back to Lobby
              </button>
            </div>
          </div>
        )}
        {!user ? (
          <div className="card max-w-md mx-auto text-center">
            <h2 style={{ 
              fontSize: "1.25rem", 
              fontWeight: "700", 
              color: "var(--foreground)", 
              marginBottom: "1rem" 
            }}>
              Welcome to Secret Hitler
            </h2>
            <p style={{ 
              color: "var(--secondary)", 
              marginBottom: "1.5rem",
              lineHeight: "1.6"
            }}>
              Sign in to create or join games with other players.
            </p>
            <button
              onClick={handleSignIn}
              className="btn btn-primary w-full"
              style={{ fontSize: "1rem", padding: "0.75rem 1rem" }}
            >
              Sign In Anonymously
            </button>
          </div>
        ) : (
          <>
            {appState === 'lobby' && (
              <GameLobby user={user} onJoinRoom={handleJoinRoom} />
            )}
            
            {appState === 'room' && currentRoomId && (
              <GameRoomComponent
                user={user}
                roomId={currentRoomId}
                onLeaveRoom={handleLeaveRoom}
                onStartGame={handleStartGame}
              />
            )}
            
            {appState === 'game' && currentRoomId && (
              <div className="max-w-4xl mx-auto p-6">
                <div className="card text-center">
                  <h2 style={{ 
                    fontSize: "1.875rem", 
                    fontWeight: "800", 
                    color: "var(--foreground)", 
                    marginBottom: "1rem" 
                  }}>
                    Game Starting!
                  </h2>
                  <p style={{ 
                    color: "var(--secondary)", 
                    marginBottom: "1.5rem" 
                  }}>
                    The actual game implementation will go here.
                  </p>
                  <button
                    onClick={handleLeaveRoom}
                    className="btn btn-secondary"
                    style={{ marginTop: "1rem" }}
                  >
                    Back to Lobby
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer with Sign Out */}
      {user && (
        <footer style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          padding: "1rem",
          boxShadow: "0 -2px 4px var(--shadow)"
        }}>
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span style={{ 
              fontSize: "0.875rem", 
              color: "var(--secondary)" 
            }}>
              Signed in as: {user.uid.substring(0, 8)}...
            </span>
            <button
              onClick={handleSignOut}
              className="btn btn-error"
              style={{ fontSize: "0.875rem" }}
            >
              Sign Out
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
