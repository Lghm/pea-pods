/**
 * CoPea — Connect Screen
 * Free peer-to-peer audio. Optional Trio AI character.
 * If Trio is enabled in settings, the AI character listens
 * and speaks after silence.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Alert, SafeAreaView, Share, ScrollView,
} from 'react-native';
import { Audio }     from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  RTCPeerConnection, RTCSessionDescription,
  RTCIceCandidate, mediaDevices,
} from 'react-native-webrtc';
import CONFIG    from '../../config';
import { CHARACTERS } from '../characters';
import { getAllSettings } from '../services/settings';
import {
  generateTrioObservation,
  generateTrioContinuation,
  generateTrioDirectResponse,
  classifyTrioResponse,
} from '../services/ai';
import { textToSpeech, clearTTSCache } from '../services/tts';
import { transcribe } from '../services/stt';

const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const fmtCode = c => `${c.slice(0,3)} ${c.slice(3)}`;
const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

export default function ConnectScreen({ onBack }) {
  const [screen,    setScreen]    = useState('home');
  const [roomCode,  setRoomCode]  = useState('');
  const [inputCode, setInputCode] = useState('');
  const [seconds,   setSeconds]   = useState(0);
  const [noiseOn,   setNoiseOn]   = useState(true);
  const [echoOn,    setEchoOn]    = useState(true);

  // Trio state
  const [trioEnabled,   setTrioEnabled]   = useState(false);
  const [trioCharacter, setTrioCharacter] = useState(null);
  const [trioStatus,    setTrioStatus]    = useState('listening');
  const [trioMessages,  setTrioMessages]  = useState([]);

  const wsRef          = useRef(null);
  const pcRef          = useRef(null);
  const streamRef      = useRef(null);
  const codeRef        = useRef('');
  const timerRef       = useRef(null);
  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const soundRef       = useRef(null);
  const recordingRef   = useRef(null);
  const transcriptRef  = useRef([]);
  const silenceRef     = useRef(null);
  const trioStateRef   = useRef('listening'); // listening|observing|waiting_permission|continuing
  const lastObsRef     = useRef('');
  const silenceSecsRef = useRef(8);

  useEffect(() => {
    getAllSettings().then(s => {
      setNoiseOn(s.noiseCancel);
      setEchoOn(s.echoCancel);
      setTrioEnabled(s.trioEnabled);
      silenceSecsRef.current = s.trioSilence;
      if (s.trioEnabled && s.trioCharacter) {
        setTrioCharacter(CHARACTERS[s.trioCharacter]);
      }
    });
    return teardown;
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.2, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ]));
    if (screen === 'waiting' || screen === 'connecting') loop.start();
    else { loop.stop(); pulseAnim.setValue(1); }
    return () => loop.stop();
  }, [screen]);

  function teardown() {
    clearInterval(timerRef.current);
    clearTimeout(silenceRef.current);
    deactivateKeepAwake();
    stopSound();
    try { pcRef.current?.close(); } catch {}
    try { wsRef.current?.close(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearTTSCache();
  }

  async function getMic() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Microphone', 'Allow microphone access in Settings → CoPea.');
      return null;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true });
    return mediaDevices.getUserMedia({
      audio: { echoCancellation: echoOn, noiseSuppression: noiseOn, autoGainControl: true },
      video: false,
    });
  }

  function buildPC(stream) {
    const pc = new RTCPeerConnection({ iceServers: CONFIG.ICE_SERVERS });
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ice-candidate', candidate: candidate.toJSON(), code: codeRef.current }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setScreen('connected');
        activateKeepAwakeAsync();
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        if (trioEnabled && trioCharacter) startTrioMode();
      } else if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        Alert.alert('Disconnected', 'The connection was lost.', [{ text: 'OK', onPress: cleanup }]);
      }
    };
    return pc;
  }

  function connectSignal(code, isHost) {
    if (CONFIG.SIGNAL_SERVER.includes('REPLACE')) {
      Alert.alert('Server not configured', 'Add your Railway server URL to config.js. See SETUP.md.');
      setScreen('home');
      return;
    }
    const ws = new WebSocket(CONFIG.SIGNAL_SERVER);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify(isHost ? { type: 'create', code } : { type: 'join', code }));

    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      const pc  = pcRef.current;
      switch (msg.type) {
        case 'created':      setScreen('waiting'); break;
        case 'guest-joined':
          if (pc) {
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription, code }));
          }
          break;
        case 'joined':       setScreen('connecting'); break;
        case 'offer':
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription, code }));
          }
          break;
        case 'answer':
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          break;
        case 'ice-candidate':
          if (pc && msg.candidate) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
          }
          break;
        case 'peer-disconnected':
          Alert.alert('Call ended', 'The other person disconnected.', [{ text: 'OK', onPress: cleanup }]);
          break;
        case 'error':
          Alert.alert('Error', msg.message || 'Something went wrong.'); cleanup(); break;
      }
    };

    ws.onerror = () => { Alert.alert('Server error', 'Check SIGNAL_SERVER in config.js.'); cleanup(); };
  }

  async function createRoom() {
    const stream = await getMic();
    if (!stream) return;
    streamRef.current = stream;
    const code = genCode();
    setRoomCode(code);
    codeRef.current = code;
    buildPC(stream);
    connectSignal(code, true);
  }

  async function joinRoom() {
    const code = inputCode.replace(/\s/g, '');
    if (code.length !== 6 || isNaN(Number(code))) { Alert.alert('Invalid code', 'Enter the 6-digit room code.'); return; }
    const stream = await getMic();
    if (!stream) return;
    streamRef.current = stream;
    setRoomCode(code);
    codeRef.current = code;
    buildPC(stream);
    connectSignal(code, false);
  }

  function cleanup() {
    teardown();
    setScreen('home');
    setSeconds(0);
    setRoomCode('');
    setInputCode('');
    setTrioMessages([]);
    transcriptRef.current = [];
    trioStateRef.current = 'listening';
  }

  // ─── TRIO MODE ──────────────────────────────────────────────────────────────

  async function startTrioMode() {
    if (!trioCharacter) return;
    // Play greeting
    await speakAsCharacter(trioCharacter.trioGreeting);
    addTrioMessage(trioCharacter.trioGreeting);
    armSilenceTimer();
    // Start periodic transcription
    startListeningLoop();
  }

  function armSilenceTimer(extended = false) {
    clearTimeout(silenceRef.current);
    const secs = extended ? CONFIG.TRIO_AFTER_NO_SECONDS : silenceSecsRef.current;
    silenceRef.current = setTimeout(() => {
      if (trioStateRef.current === 'listening') {
        handleSilence();
      }
    }, secs * 1000);
  }

  function resetSilenceTimer() {
    if (trioStateRef.current !== 'listening') {
      trioStateRef.current = 'listening';
    }
    armSilenceTimer();
  }

  async function handleSilence() {
    if (!trioCharacter || transcriptRef.current.length === 0) {
      armSilenceTimer();
      return;
    }
    trioStateRef.current = 'observing';
    setTrioStatus('thinking');

    try {
      const observation = await generateTrioObservation(trioCharacter, transcriptRef.current);
      lastObsRef.current = observation;
      addTrioMessage(observation);
      trioStateRef.current = 'waiting_permission';
      setTrioStatus('waiting');
      await speakAsCharacter(observation);
      // Now listen for yes/no
      listenForPermission();
    } catch {
      trioStateRef.current = 'listening';
      setTrioStatus('listening');
      armSilenceTimer();
    }
  }

  async function listenForPermission() {
    // Record for 5 seconds to capture response
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      await new Promise(r => setTimeout(r, 5000));
      await recording.stopAndUnloadAsync();
      const uri  = recording.getURI();
      recordingRef.current = null;
      const text = await transcribe(uri);

      if (!text) { trioStateRef.current = 'listening'; setTrioStatus('listening'); armSilenceTimer(); return; }

      const classification = await classifyTrioResponse(text, trioCharacter.name);

      if (classification === 'yes') {
        await handleTrioYes(text);
      } else if (classification === 'no') {
        // STOP IMMEDIATELY — no closing line
        trioStateRef.current = 'listening';
        setTrioStatus('listening');
        armSilenceTimer(true); // longer wait after no
      } else if (classification === 'question') {
        await handleTrioQuestion(text);
      } else {
        // Resume — users talking to each other
        addTranscript('User', text);
        trioStateRef.current = 'listening';
        setTrioStatus('listening');
        armSilenceTimer();
      }
    } catch {
      trioStateRef.current = 'listening';
      setTrioStatus('listening');
      armSilenceTimer();
    }
  }

  async function handleTrioYes() {
    trioStateRef.current = 'continuing';
    setTrioStatus('thinking');
    try {
      const continuation = await generateTrioContinuation(trioCharacter, transcriptRef.current, lastObsRef.current);
      lastObsRef.current = continuation;
      addTrioMessage(continuation);
      trioStateRef.current = 'waiting_permission';
      setTrioStatus('waiting');
      await speakAsCharacter(continuation);
      listenForPermission();
    } catch {
      trioStateRef.current = 'listening';
      setTrioStatus('listening');
      armSilenceTimer();
    }
  }

  async function handleTrioQuestion(question) {
    trioStateRef.current = 'observing';
    setTrioStatus('thinking');
    try {
      const response = await generateTrioDirectResponse(trioCharacter, transcriptRef.current, question);
      addTrioMessage(response);
      trioStateRef.current = 'listening';
      setTrioStatus('listening');
      await speakAsCharacter(response);
      armSilenceTimer();
    } catch {
      trioStateRef.current = 'listening';
      setTrioStatus('listening');
      armSilenceTimer();
    }
  }

  function startListeningLoop() {
    // Periodic recording to build transcript
    const loop = async () => {
      if (trioStateRef.current !== 'listening') return;
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await new Promise(r => setTimeout(r, 8000));
        if (trioStateRef.current !== 'listening') { try { await recording.stopAndUnloadAsync(); } catch {} return; }
        await recording.stopAndUnloadAsync();
        const uri  = recording.getURI();
        const text = await transcribe(uri);
        if (text) {
          addTranscript('User', text);
          resetSilenceTimer();
        }
      } catch {}
      if (trioStateRef.current === 'listening') setTimeout(loop, 1000);
    };
    setTimeout(loop, 2000);
  }

  function addTranscript(speaker, text) {
    transcriptRef.current = [...transcriptRef.current.slice(-CONFIG.TRIO_MAX_TRANSCRIPT), { speaker, text }];
  }

  function addTrioMessage(text) {
    setTrioMessages(prev => [...prev, { id: Date.now(), text }]);
  }

  async function speakAsCharacter(text) {
    try {
      await stopSound();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const uri = await textToSpeech(text, trioCharacter.voiceKey);
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      await new Promise(resolve => sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish || !s.isLoaded) resolve(); }));
    } catch (e) { console.error('Speak error:', e); }
  }

  async function stopSound() {
    if (!soundRef.current) return;
    try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
    soundRef.current = null;
  }

  const shareCode = async () => {
    try { await Share.share({ message: `Join my CoPea room! Code: ${roomCode}` }); } catch {}
  };

  const trioStatusLabel = () => {
    if (!trioEnabled || !trioCharacter) return null;
    const labels = {
      listening: `${trioCharacter.emoji} listening`,
      thinking:  `${trioCharacter.emoji} thinking…`,
      waiting:   `${trioCharacter.emoji} waiting for your answer`,
      continuing:`${trioCharacter.emoji} continuing…`,
    };
    return labels[trioStatus] || null;
  };

  // ─── SCREENS ────────────────────────────────────────────────────────────────

  if (screen === 'home') return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.center}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Connect</Text>
        <Text style={s.subtitle}>Share one pair of earphones between two people.</Text>
        {trioEnabled && trioCharacter && (
          <View style={s.trioBanner}>
            <Text style={s.trioBannerText}>{trioCharacter.emoji} Trio Mode on · {trioCharacter.name} will listen</Text>
          </View>
        )}
        <TouchableOpacity style={s.btnPrimary} onPress={createRoom} activeOpacity={0.85}>
          <Text style={s.btnPrimaryText}>Create Room</Text>
        </TouchableOpacity>
        <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>or join</Text><View style={s.divLine} /></View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Room Code</Text>
          <TextInput
            style={s.codeInput}
            value={inputCode}
            onChangeText={t => setInputCode(t.replace(/\D/g,'').slice(0,6))}
            placeholder="000 000"
            placeholderTextColor="#1E3329"
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={joinRoom}
            maxLength={6}
          />
        </View>
        <TouchableOpacity style={s.btnSecondary} onPress={joinRoom} activeOpacity={0.85}>
          <Text style={s.btnSecondaryText}>Join Room</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Both people need to have CoPea open</Text>
      </View>
    </SafeAreaView>
  );

  if (screen === 'waiting') return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.center}>
        <Text style={s.title}>Your Code</Text>
        <TouchableOpacity onPress={shareCode} style={s.bigCodeBlock}>
          <Text style={s.bigCode}>{fmtCode(roomCode)}</Text>
          <Text style={s.shareHint}>Tap to share</Text>
        </TouchableOpacity>
        <View style={s.card}>
          <View style={s.statusRow}>
            <Animated.View style={[s.dot, s.dotOrange, { opacity: pulseAnim }]} />
            <Text style={s.statusText}>Waiting for the other person…</Text>
          </View>
        </View>
        <TouchableOpacity style={s.btnDanger} onPress={cleanup} activeOpacity={0.85}>
          <Text style={s.btnDangerText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (screen === 'connecting') return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.center}>
        <View style={s.card}>
          <View style={s.statusRow}>
            <Animated.View style={[s.dot, s.dotOrange, { opacity: pulseAnim }]} />
            <Text style={s.statusText}>Connecting…</Text>
          </View>
        </View>
        <TouchableOpacity style={s.btnDanger} onPress={cleanup} activeOpacity={0.85}>
          <Text style={s.btnDangerText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (screen === 'connected') return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.connectedScroll} showsVerticalScrollIndicator={false}>

        <View style={s.connectedHeader}>
          <View style={s.statusRow}>
            <Animated.View style={[s.dot, s.dotGreen, { opacity: pulseAnim }]} />
            <Text style={s.statusGreen}>Connected</Text>
          </View>
          <Text style={s.timer}>{fmtTime(seconds)}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.connectedDesc}>
            🎧 Always on — both earphones are live.{'\n'}Speak naturally.
          </Text>
        </View>

        {/* Trio status */}
        {trioEnabled && trioCharacter && (
          <View style={s.trioCard}>
            <Text style={s.trioStatusText}>{trioStatusLabel()}</Text>
            {trioMessages.length > 0 && (
              <View style={s.trioMessages}>
                {trioMessages.slice(-3).map(m => (
                  <View key={m.id} style={s.trioMsg}>
                    <Text style={s.trioMsgEmoji}>{trioCharacter.emoji}</Text>
                    <Text style={s.trioMsgText}>{m.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Toggles */}
        <View style={s.card}>
          {[
            { label: 'Noise Cancellation', desc: 'Suppress background noise', val: noiseOn, set: setNoiseOn },
            { label: 'Echo Cancellation',  desc: 'Prevent feedback',          val: echoOn,  set: setEchoOn  },
          ].map((item, i) => (
            <View key={item.label} style={[s.toggleRow, i > 0 && s.toggleBorder]}>
              <View style={s.toggleInfo}>
                <Text style={s.toggleTitle}>{item.label}</Text>
                <Text style={s.toggleDesc}>{item.desc}</Text>
              </View>
              <TouchableOpacity
                style={[s.track, item.val && s.trackOn]}
                onPress={() => item.set(!item.val)}
                activeOpacity={0.85}
              >
                <View style={[s.thumb, item.val && s.thumbOn]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.btnDanger} onPress={() => Alert.alert('End call', 'End this conversation?', [
          { text: 'Keep talking', style: 'cancel' },
          { text: 'End call', style: 'destructive', onPress: cleanup },
        ])} activeOpacity={0.85}>
          <Text style={s.btnDangerText}>End Call</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );

  return null;
}

const C = {
  bg: '#060E0B', surface: '#0C1A15', border: 'rgba(255,255,255,0.07)',
  green: '#1DB87A', greenDim: 'rgba(29,184,122,0.13)',
  orange: '#F5A623', red: '#FF4B6E',
  text: '#D8EDE5', text2: '#466057', text3: '#1E3329',
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, gap: 14 },
  connectedScroll: { padding: 20, gap: 14, flexGrow: 1 },

  backBtn:  { alignSelf: 'flex-start', marginBottom: 4 },
  backText: { fontSize: 14, color: C.green, fontWeight: '500' },
  title:    { fontSize: 32, fontWeight: '200', color: C.text, letterSpacing: -1, alignSelf: 'flex-start' },
  subtitle: { fontSize: 13, color: C.text2, alignSelf: 'flex-start', lineHeight: 18 },

  trioBanner: { backgroundColor: 'rgba(29,184,122,0.1)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(29,184,122,0.2)', alignSelf: 'flex-start' },
  trioBannerText: { fontSize: 12, color: C.green, fontWeight: '500' },

  card: { width: '100%', backgroundColor: C.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.border },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.text2, marginBottom: 10 },

  codeInput: { backgroundColor: '#0C1A15', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 28, fontWeight: '500', color: C.text, textAlign: 'center', letterSpacing: 8, borderWidth: 1.5, borderColor: C.border },

  bigCodeBlock: { alignItems: 'center', marginVertical: 4 },
  bigCode:   { fontSize: 54, fontWeight: '200', color: C.green, letterSpacing: 10 },
  shareHint: { fontSize: 12, color: C.text2, marginTop: 4 },

  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:         { width: 9, height: 9, borderRadius: 5 },
  dotOrange:   { backgroundColor: C.orange, shadowColor: C.orange, shadowOffset: {width:0,height:0}, shadowOpacity: 0.9, shadowRadius: 8 },
  dotGreen:    { backgroundColor: C.green,  shadowColor: C.green,  shadowOffset: {width:0,height:0}, shadowOpacity: 0.9, shadowRadius: 8 },
  statusText:  { fontSize: 14, color: C.text2 },
  statusGreen: { fontSize: 14, color: C.green, fontWeight: '600' },

  connectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  timer:           { fontSize: 14, color: C.text2, letterSpacing: 1 },
  connectedDesc:   { fontSize: 13, color: C.text2, lineHeight: 20, textAlign: 'center' },

  trioCard: { backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(29,184,122,0.2)', gap: 10 },
  trioStatusText: { fontSize: 12, color: C.green, fontWeight: '500' },
  trioMessages: { gap: 8 },
  trioMsg: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  trioMsgEmoji: { fontSize: 16, lineHeight: 20 },
  trioMsgText:  { fontSize: 13, color: '#D8EDE5', lineHeight: 19, flex: 1 },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  toggleBorder:{ borderTopWidth: 1, borderTopColor: C.border },
  toggleInfo:  { flex: 1, paddingRight: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '500', color: C.text, marginBottom: 2 },
  toggleDesc:  { fontSize: 12, color: C.text2 },
  track: { width: 50, height: 29, borderRadius: 15, backgroundColor: '#1E3329', borderWidth: 1, borderColor: C.border, justifyContent: 'center', paddingHorizontal: 3 },
  trackOn: { backgroundColor: C.greenDim, borderColor: C.green },
  thumb:   { width: 23, height: 23, borderRadius: 12, backgroundColor: C.text2 },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: C.green },

  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontSize: 11, color: C.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },

  btnPrimary:     { width: '100%', backgroundColor: C.green, paddingVertical: 17, borderRadius: 15, alignItems: 'center', shadowColor: C.green, shadowOffset: {width:0,height:6}, shadowOpacity: 0.35, shadowRadius: 14 },
  btnPrimaryText: { color: '#060E0B', fontSize: 16, fontWeight: '700' },
  btnSecondary:     { width: '100%', backgroundColor: C.surface, paddingVertical: 17, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  btnSecondaryText: { color: C.text, fontSize: 16, fontWeight: '600' },
  btnDanger:     { width: '100%', backgroundColor: 'rgba(255,75,110,0.09)', paddingVertical: 17, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,75,110,0.2)' },
  btnDangerText: { color: C.red, fontSize: 16, fontWeight: '600' },

  hint: { fontSize: 12, color: C.text3, textAlign: 'center' },
});
