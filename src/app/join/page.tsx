'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInAnonymously, signInWithPopup, signOut, User } from 'firebase/auth';
import { googleProvider } from '@/lib/firebase';
import { GameRoomService } from '@/services/gameRoomService';
import GameLobby from '@/components/GameLobby';
import GameRoomComponent from '@/components/GameRoomComponent';

type AppState = 'loading' | 'auth' | 'username' | 'joining' | 'lobby' | 'room' | 'game';

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameCode = searchParams.get('code');
  
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    // Initialize auth listener
    if (!auth) {
      console.error('Firebase auth not initialized');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setUser(user);
      if (user) {
        // Extract display name from Google account or use email
        const displayName = user.displayName || user.email?.split('@')[0] || '';
        setPlayerName(displayName);
        
        if (gameCode) {
          // If user is anonymous and joining via game code, prompt for username
          if (user.isAnonymous && !displayName) {
            setAppState('username');
          } else {
            setAppState('joining'); // Automatically try to join when authenticated
          }
        } else {
          setAppState('lobby'); // No game code, go to lobby
        }
      } else {
        setAppState('auth');
      }
    });

    return () => unsubscribe();
  }, [gameCode]);

  // Auto-join effect when user is authenticated and we're in joining state
  useEffect(() => {
    if (appState === 'joining' && user && gameCode) {
      handleAutoJoin();
    }
  }, [appState, user, gameCode]);

  const handleAutoJoin = async () => {
    if (!user || !gameCode) return;

    try {
      setError(null);
      
      // Try to find the room by game code
      const room = await GameRoomService.findRoomByCode(gameCode.toUpperCase());
      if (!room) {
        setError(`Game not found with code: ${gameCode.toUpperCase()}`);
        setAppState('auth');
        return;
      }

      // Check if room is full
      if (room.players.length >= room.maxPlayers) {
        setError('This game room is full');
        setAppState('auth');
        return;
      }

      // Check if user is already in the room
      const existingPlayer = room.players.find(p => p.id === user.uid);
      if (existingPlayer) {
        // User is already in the room, just join
        setCurrentRoomId(room.id);
        setAppState('room');
        return;
      }

      // Join the room
      await GameRoomService.joinRoom(room.id, user, playerName);
      setCurrentRoomId(room.id);
      setAppState('room');
      
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join the game room');
      setAppState('auth');
    }
  };

  const handleSignInAnonymously = async () => {
    try {
      setError(null);
      if (auth) {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      setError('Failed to sign in anonymously');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      if (auth && googleProvider) {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      // If user is in a room, leave it first
      if (currentRoomId && user) {
        await GameRoomService.leaveRoom(currentRoomId, user.uid);
      }
      
      if (auth) {
        await signOut(auth);
      }
      setCurrentRoomId(null);
      setAppState('auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleUsernameSubmit = (username: string) => {
    setPlayerName(username.trim());
    setAppState('joining');
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--foreground)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (appState === 'auth') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)',
        padding: '1rem'
      }}>
        <div style={{
          background: 'var(--surface)',
          border: `1px solid var(--border)`,
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: 'var(--foreground)',
            marginBottom: '0.5rem'
          }}>
            {gameCode ? 'Join Game' : 'Secret Hitler'}
          </h1>
          
          {gameCode && (
            <p style={{
              color: 'var(--secondary)',
              marginBottom: '1.5rem'
            }}>
              Game Code: <strong style={{ 
                fontFamily: 'var(--font-geist-mono, monospace)',
                color: 'var(--primary)'
              }}>{gameCode.toUpperCase()}</strong>
            </p>
          )}

          {error && (
            <div style={{
              background: 'var(--error-bg)',
              color: 'var(--error)',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <p style={{
            color: 'var(--secondary)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {gameCode ? 'Sign in to join the game' : 'Sign in to play'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleGoogleSignIn}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Sign in with Google
            </button>
            
            <button
              onClick={handleSignInAnonymously}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Continue as Guest
            </button>
          </div>

          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'username') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)',
        padding: '1rem'
      }}>
        <div style={{
          background: 'var(--surface)',
          border: `1px solid var(--border)`,
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: 'var(--foreground)',
            marginBottom: '0.5rem'
          }}>
            Choose Username
          </h1>
          
          {gameCode && (
            <p style={{
              color: 'var(--secondary)',
              marginBottom: '1.5rem'
            }}>
              Game Code: <strong style={{ 
                fontFamily: 'var(--font-geist-mono, monospace)',
                color: 'var(--primary)'
              }}>{gameCode.toUpperCase()}</strong>
            </p>
          )}

          <p style={{
            color: 'var(--secondary)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            Enter a username to join the game
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
                Join Game
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

          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'joining') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--foreground)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Joining game...</p>
          {gameCode && (
            <p style={{ color: 'var(--secondary)', fontSize: '0.875rem' }}>
              Code: {gameCode.toUpperCase()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (appState === 'lobby') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--background)',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: 'var(--foreground)'
            }}>
              Secret Hitler
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user && (
                <span style={{ 
                  color: 'var(--secondary)',
                  fontSize: '0.875rem'
                }}>
                  {user.displayName || user.email || 'Anonymous'}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="btn btn-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>

          <GameLobby
            user={user!}
            playerName={playerName}
            onJoinRoom={handleJoinRoom}
          />
        </div>
      </div>
    );
  }

  if (appState === 'room' && currentRoomId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--background)',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: 'var(--foreground)'
            }}>
              Secret Hitler
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user && (
                <span style={{ 
                  color: 'var(--secondary)',
                  fontSize: '0.875rem'
                }}>
                  {user.displayName || user.email || 'Anonymous'}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="btn btn-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>

          <GameRoomComponent
            user={user!}
            roomId={currentRoomId}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={handleStartGame}
          />
        </div>
      </div>
    );
  }

  if (appState === 'game') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--background)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--foreground)'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            marginBottom: '1rem'
          }}>
            🎮 Game Started!
          </h1>
          <p style={{
            color: 'var(--secondary)',
            marginBottom: '2rem'
          }}>
            Game implementation coming soon...
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function JoinGamePage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--foreground)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <JoinGameContent />
    </Suspense>
  );
}