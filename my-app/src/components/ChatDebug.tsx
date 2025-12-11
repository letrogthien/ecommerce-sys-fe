import React, { useEffect, useState } from 'react';
import { guestChatService } from '../services/guestChatService';
import { getGuestToken, getGuestUUID, initGuestSession } from '../services/guestSessionService';

export const ChatDebug: React.FC = () => {
  const [uuid, setUuid] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<string>('Not connected');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    const storedUuid = getGuestUUID();
    const storedToken = getGuestToken();
    setUuid(storedUuid);
    setToken(storedToken);
    
    if (storedUuid) {
      addLog(`Found stored UUID: ${storedUuid.substring(0, 8)}...`);
    }
    if (storedToken) {
      addLog(`Found stored token: ${storedToken.substring(0, 50)}...`);
    }
  }, []);

  const handleInitSession = async () => {
    try {
      setError(null);
      addLog('Initializing guest session...');
      const newToken = await initGuestSession();
      setToken(newToken);
      setUuid(getGuestUUID());
      addLog('✅ Session initialized successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addLog(`❌ Error: ${errorMsg}`);
    }
  };

  const handleConnectWS = async () => {
    try {
      setError(null);
      addLog('Connecting to WebSocket...');
      setWsStatus('Connecting...');
      
      await guestChatService.connect((msg) => {
        addLog(`📨 Received: ${msg.text.substring(0, 50)}...`);
      });
      
      setWsStatus('Connected');
      addLog('✅ WebSocket connected');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setWsStatus('Error');
      addLog(`❌ WS Error: ${errorMsg}`);
    }
  };

  const handleSendMessage = () => {
    if (guestChatService.isConnected()) {
      guestChatService.sendMessage('Test message from debug', '');
      addLog('📤 Message sent');
    } else {
      addLog('❌ Not connected');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
      <h2>Guest Chat Debug Panel</h2>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0' }}>
        <div><strong>UUID:</strong> {uuid || 'Not set'}</div>
        <div><strong>Token:</strong> {token ? `${token.substring(0, 50)}...` : 'Not set'}</div>
        <div><strong>WebSocket:</strong> {wsStatus}</div>
        {error && <div style={{ color: 'red' }}><strong>Error:</strong> {error}</div>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleInitSession} style={{ marginRight: '10px', padding: '8px 16px' }}>
          1. Initialize Session
        </button>
        <button onClick={handleConnectWS} style={{ marginRight: '10px', padding: '8px 16px' }} disabled={!token}>
          2. Connect WebSocket
        </button>
        <button onClick={handleSendMessage} style={{ padding: '8px 16px' }} disabled={wsStatus !== 'Connected'}>
          3. Send Test Message
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '400px', overflowY: 'auto', background: '#fff' }}>
        <h3>Logs:</h3>
        {logs.map((log, i) => (
          <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #eee' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
