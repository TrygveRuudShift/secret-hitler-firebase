'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously, signOut, User } from 'firebase/auth';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  timestamp: { toDate?: () => Date } | Date;
  userId: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

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
      setMessages([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        timestamp: new Date(),
        userId: user.uid
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          Next.js + Firebase Demo
        </h1>
        
        {!user ? (
          <div className="text-center">
            <p className="mb-4 text-gray-600">Sign in to start using the app</p>
            <button
              onClick={handleSignIn}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Sign In Anonymously
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <p className="text-sm text-gray-600 mb-2">
                Signed in as: {user.uid}
              </p>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>

            <form onSubmit={handleSubmitMessage} className="mb-6 p-4 bg-white rounded-lg shadow">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enter a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Send
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold mb-4">Messages</h2>
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No messages yet. Be the first to send one!</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-900">{message.text}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      From: {message.userId.substring(0, 8)}... • {' '}
                      {typeof message.timestamp === 'object' && message.timestamp && 'toDate' in message.timestamp
                        ? message.timestamp.toDate?.()?.toLocaleString()
                        : message.timestamp instanceof Date
                        ? message.timestamp.toLocaleString()
                        : 'Unknown time'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
