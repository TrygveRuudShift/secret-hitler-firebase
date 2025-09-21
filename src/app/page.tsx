'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInAnonymously, signInWithPopup, signOut, User } from 'firebase/auth';
import { GameRoomService } from '@/services/gameRoomService';
import GameLobby from '@/components/GameLobby';
import GameRoomComponent from '@/components/GameRoomComponent';

type AppState = 'loading' | 'username' | 'lobby' | 'room' | 'game';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    // Only initialize auth listener if Firebase is available
    if (!auth) {
      setAppState('lobby');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setUser(user);
      if (user) {
        // Extract display name from Google account or use email
        const displayName = user.displayName || user.email?.split('@')[0] || '';
        setPlayerName(displayName);
        
        // If user is anonymous and no display name, prompt for username
        if (user.isAnonymous && !displayName) {
          setAppState('username');
        } else {
          setAppState('lobby');
        }
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
      // If user is in a room, leave it first
      if (currentRoomId && user) {
        await GameRoomService.leaveRoom(currentRoomId, user.uid);
      }
      
      await signOut(auth);
      setAppState('lobby');
      setCurrentRoomId(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUsernameSubmit = (username: string) => {
    setPlayerName(username.trim());
    setAppState('lobby');
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
            {appState === 'username' && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh'
              }}>
                <div style={{
                  background: 'var(--surface)',
                  border: `1px solid var(--border)`,
                  borderRadius: '12px',
                  padding: '2rem',
                  maxWidth: '400px',
                  width: '100%',
                  textAlign: 'center',
                  margin: '1rem'
                }}>
                  <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: 'var(--foreground)',
                    marginBottom: '0.5rem'
                  }}>
                    Choose Username
                  </h1>

                  <p style={{
                    color: 'var(--secondary)',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem'
                  }}>
                    Enter a username to continue
                  </p>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const username = formData.get('username') as string;
                    if (username && username.trim()) {
                      handleUsernameSubmit(username);
                    }
                  }}>
                    <input
                      type="text"
                      name="username"
                      placeholder="Enter your username"
                      maxLength={20}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: `1px solid var(--border)`,
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '1rem',
                        marginBottom: '1rem'
                      }}
                      autoFocus
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        Continue
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {appState === 'lobby' && (
              <GameLobby user={user} playerName={playerName} onJoinRoom={handleJoinRoom} />
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
