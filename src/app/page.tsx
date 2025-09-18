'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInAnonymously, signInWithPopup, signOut, User } from 'firebase/auth';
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

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={handleGoogleSignIn}
                className="btn btn-primary w-full"
                style={{ 
                  fontSize: "1rem", 
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: "currentColor" }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign In with Google
              </button>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                margin: "0.5rem 0",
                color: "var(--secondary)",
                fontSize: "0.875rem"
              }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
                <span style={{ padding: "0 1rem" }}>or</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
              </div>
              <button
                onClick={handleSignIn}
                className="btn btn-secondary w-full"
                style={{ fontSize: "1rem", padding: "0.75rem 1rem" }}
              >
                Continue as Guest
              </button>
            </div>
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
              Signed in as: {user.displayName || `Guest (${user.uid.substring(0, 8)}...)`}
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
