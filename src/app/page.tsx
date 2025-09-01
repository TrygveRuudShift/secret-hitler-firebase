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
    const unsubscribe = auth.onAuthStateChanged((user) => {
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
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Secret Hitler</h1>
              {appState !== 'lobby' && (
                <button
                  onClick={handleLeaveRoom}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Back to Lobby
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Signed in as: {user.uid.substring(0, 8)}...
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Sign In to Play
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {!user ? (
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-xl font-semibold mb-4">Welcome to Secret Hitler</h2>
            <p className="text-gray-600 mb-6">
              Sign in to create or join games with other players.
            </p>
            <button
              onClick={handleSignIn}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
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
                <div className="bg-white p-8 rounded-lg shadow text-center">
                  <h2 className="text-2xl font-bold mb-4">Game Starting!</h2>
                  <p className="text-gray-600">
                    The actual game implementation will go here.
                  </p>
                  <button
                    onClick={handleLeaveRoom}
                    className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Back to Lobby
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
