/**
 * Pea Pods
 *
 * Two Peas in a Pod   — Free. Peer-to-peer audio.
 * Three Peas in a Pod — £1.99/week. AI joins two people.
 * Live News Pod       — £1.99/week. One person + AI + today's news.
 */

import React, { useState } from 'react';
import HomeScreen                          from './src/screens/HomeScreen';
import ConnectScreen                       from './src/screens/ConnectScreen';
import SoloScreen                          from './src/screens/SoloScreen';
import SettingsScreen                      from './src/screens/SettingsScreen';
import { CharacterScreen, SubscribeScreen } from './src/screens/ExtraScreens';
import { startTrialIfNew, needsSubscription } from './src/services/trial';

export default function App() {
  const [screen,    setScreen]    = useState('home');
  const [character, setCharacter] = useState(null);
  const [podMode,   setPodMode]   = useState(null);

  const goHome = () => { setScreen('home'); setCharacter(null); setPodMode(null); };

  const handlePaidMode = async (mode) => {
    await startTrialIfNew();
    const locked = await needsSubscription();
    if (locked) { setScreen('subscribe'); return; }
    setPodMode(mode);
    setScreen('characters');
  };

  if (screen === 'home') return (
    <HomeScreen
      onTwoPeas={()   => setScreen('connect')}
      onThreePeas={() => handlePaidMode('three')}
      onLiveNews={()  => handlePaidMode('live')}
      onSettings={()  => setScreen('settings')}
    />
  );

  if (screen === 'connect')   return <ConnectScreen onBack={goHome} />;
  if (screen === 'settings')  return <SettingsScreen onBack={goHome} />;
  if (screen === 'subscribe') return <SubscribeScreen onBack={goHome} />;

  if (screen === 'characters') return (
    <CharacterScreen
      onSelect={c => { setCharacter(c); setScreen(podMode === 'live' ? 'solo' : 'connect_trio'); }}
      onBack={goHome}
      mode={podMode}
    />
  );

  if (screen === 'connect_trio' && character) return (
    <ConnectScreen onBack={goHome} trioCharacterOverride={character} />
  );

  if (screen === 'solo' && character) return (
    <SoloScreen character={character} onEnd={goHome} />
  );

  return null;
}
