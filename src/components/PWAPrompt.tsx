'use client';

import { useEffect, useState } from 'react';

export default function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--surface)',
      border: `1px solid var(--border)`,
      borderRadius: '12px',
      padding: '1rem 1.5rem',
      boxShadow: '0 4px 12px var(--shadow)',
      zIndex: 1000,
      maxWidth: '350px',
      width: '90%'
    }}>
      <div style={{
        textAlign: 'center'
      }}>
        <h3 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1rem',
          fontWeight: '600',
          color: 'var(--foreground)'
        }}>
          📱 Install Secret Hitler
        </h3>
        <p style={{
          margin: '0 0 1rem 0',
          fontSize: '0.875rem',
          color: 'var(--secondary)',
          lineHeight: '1.4'
        }}>
          Install this app on your device for quick access and a better experience!
        </p>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{
              fontSize: '0.875rem',
              padding: '0.5rem 1rem'
            }}
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="btn btn-secondary"
            style={{
              fontSize: '0.875rem',
              padding: '0.5rem 1rem'
            }}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}