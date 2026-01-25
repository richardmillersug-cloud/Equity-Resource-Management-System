'use client';

import { useEffect, useState } from 'react';

export default function ClickDebugger() {
  const [emergencyMode, setEmergencyMode] = useState(false);

  useEffect(() => {
    // EMERGENCY ESCAPE: Press Escape 5 times quickly to enable emergency mode
    let escapePressCount = 0;
    let escapeTimeout: NodeJS.Timeout;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        escapePressCount++;
        clearTimeout(escapeTimeout);
        
        if (escapePressCount >= 5) {
          console.log('🚨 EMERGENCY MODE ACTIVATED');
          setEmergencyMode(true);
          // Remove all blocking overlays
          document.querySelectorAll('[class*="fixed"][class*="inset"]').forEach(el => {
            const styles = window.getComputedStyle(el);
            if (parseInt(styles.zIndex) > 10) {
              (el as HTMLElement).style.display = 'none';
            }
          });
          // Force enable pointer events
          document.body.style.pointerEvents = 'auto';
          document.body.style.userSelect = 'auto';
          document.documentElement.style.pointerEvents = 'auto';
          escapePressCount = 0;
          alert('🚨 EMERGENCY MODE: All blocking overlays removed. Page should be clickable now.');
        }
        
        escapeTimeout = setTimeout(() => {
          escapePressCount = 0;
        }, 1000);
      }
    };

    // Check URL parameter for emergency mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('emergency') === 'true') {
      setEmergencyMode(true);
      document.body.style.pointerEvents = 'auto';
      document.body.style.userSelect = 'auto';
    }

    window.addEventListener('keydown', handleEscape);

    // Add debug helper to window
    (window as any).debugClicks = {
      checkOverlays: () => {
        const overlays = document.querySelectorAll('[class*="fixed"][class*="inset"]');
        console.log('Found overlays:', overlays.length);
        overlays.forEach((overlay, i) => {
          const styles = window.getComputedStyle(overlay);
          console.log(`Overlay ${i}:`, {
            element: overlay,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            pointerEvents: styles.pointerEvents,
            position: styles.position
          });
        });
        return overlays;
      },
      removeOverlays: () => {
        const overlays = document.querySelectorAll('[class*="fixed"][class*="inset"]');
        overlays.forEach(overlay => {
          const styles = window.getComputedStyle(overlay);
          // Only remove if it's actually blocking (visible and high z-index)
          if (styles.display !== 'none' && 
              styles.visibility !== 'hidden' && 
              parseFloat(styles.opacity) > 0 &&
              parseInt(styles.zIndex) > 10) {
            console.log('Removing blocking overlay:', overlay);
            (overlay as HTMLElement).style.display = 'none';
          }
        });
      },
      checkPointerEvents: () => {
        const body = document.body;
        const bodyStyles = window.getComputedStyle(body);
        console.log('Body pointer-events:', bodyStyles.pointerEvents);
        console.log('Body display:', bodyStyles.display);
        console.log('Body visibility:', bodyStyles.visibility);
      },
      enableClicks: () => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.userSelect = 'auto';
        document.documentElement.style.pointerEvents = 'auto';
        console.log('Enabled clicks on body');
      },
      emergencyMode: () => {
        // Remove ALL fixed overlays
        document.querySelectorAll('[class*="fixed"]').forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });
        document.body.style.pointerEvents = 'auto';
        document.body.style.userSelect = 'auto';
        document.documentElement.style.pointerEvents = 'auto';
        console.log('🚨 EMERGENCY MODE: All overlays removed');
        alert('🚨 EMERGENCY MODE: All blocking elements removed');
      }
    };

    // Check for errors
    window.addEventListener('error', (e) => {
      console.error('JavaScript error detected:', e.error);
    });

    // Check for unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
    });

    console.log('🔍 Click Debugger loaded. Use these commands:');
    console.log('- debugClicks.checkOverlays() - Check for blocking overlays');
    console.log('- debugClicks.removeOverlays() - Remove blocking overlays');
    console.log('- debugClicks.checkPointerEvents() - Check pointer events');
    console.log('- debugClicks.enableClicks() - Force enable clicks');
    console.log('- debugClicks.emergencyMode() - Remove ALL blocking elements');
    console.log('🚨 EMERGENCY: Press Escape 5 times quickly to activate emergency mode');
    console.log('🚨 EMERGENCY: Add ?emergency=true to URL to bypass blocking');

    // Prevent anything from blocking DevTools
    const preventDevToolsBlock = () => {
      // Remove any event listeners that might block F12
      document.addEventListener('keydown', (e) => {
        // Allow F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')) {
          e.stopPropagation();
        }
      }, true);
    };

    preventDevToolsBlock();

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Emergency mode visual indicator
  if (emergencyMode) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'red',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          zIndex: 999999,
          pointerEvents: 'auto'
        }}
      >
        🚨 EMERGENCY MODE ACTIVE - Page should be clickable now
        <button 
          onClick={() => window.location.reload()}
          style={{ marginLeft: '20px', padding: '5px 10px', cursor: 'pointer' }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return null;
}
