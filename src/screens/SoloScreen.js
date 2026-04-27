/**
 * CoPea — Solo Screen
 * One person + AI character. News debate.
 * States: loading → active → sleeping → (wake on CoPea)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Alert, SafeAreaView,
} from 'react-native';
import { Audio }     from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { fetchStoryCandidates, markStoryUsed } from '../services/news';
import {
  selectBestStory, generateOpening, generateResponse,
  generateSilencePrompt, generateClose, generateWakeResponse,
} from '../services/ai';
import { textToSpeech, clearTTSCache } from '../services/tts';
import { transcribe }                   from '../services/stt';
import { getAllSettings }               from '../services/settings';

const SILENCE_NUDGE = 45000;
const SILENCE_CLOSE = 90000;

export default function SoloScreen({ character, onEnd }) {
  const [appState,    setAppState]    = useState('loading');
  const [messages,    setMessages]    = useState([]);
  const [status,      setStatus]      = useState('Reading the news…');
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy,      setIsBusy]      = useState(true);
  const [headline,    setHeadline]    = useState('');
  const [seconds,     setSeconds]     = useState(0);

  const recordingRef = useRef(null);
  const soundRef     = useRef(null);
  const historyRef   = useRef([]);
  const timerRef     = useRef(null);
  const s1Ref        = useRef(null);
  const s2Ref        = useRef(null);
  const scrollRef    = useRef(null);
  const micScale     = useRef(new Animated.Value(1)).current;
  const sleepOpacity = useRef(new Animated.Value(0)).current;
  const topicsRef    = useRef(['world','science','society','environment']);

  useEffect(() => {
    activateKeepAwakeAsync();
    getAllSettings().then(s => { topicsRef.current = s.topics; });
    setupAudio();
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    init();
    return () => {
      deactivateKeepAwake();
      clearInterval(timerRef.current);
      clearTimeout(s1Ref.current);
      clearTimeout(s2Ref.current);
      stopSound();
      safeStop();
      clearTTSCache();
    };
  }, []);

  async function setupAudio() {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true });
  }

  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  async function init() {
    try {
      const candidates = await fetchStoryCandidates(topicsRef.current);
      const story      = await selectBestStory(character, candidates);
      setHeadline(story.headline);
      await markStoryUsed(story.id);
      const opening = await generateOpening(character, story);
      historyRef.current = [
        { role: 'user',      content: `Today's news: ${story.headline}. ${story.summary}. Open the conversation.` },
        { role: 'assistant', content: opening },
      ];
      addMsg('assistant', opening);
      await speak(opening);
      setAppState('active');
    } catch (err) {
      Alert.alert('Could not start', 'Check API keys in config.js.\n' + err.message, [{ text: 'Go back', onPress: onEnd }]);
    }
  }

  async function speak(text) {
    try {
      setStatus('Speaking…'); setIsBusy(true);
      await stopSound();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const uri = await textToSpeech(text, character.voiceKey);
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      await new Promise(r => sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish || !s.isLoaded) r(); }));
    } catch {}
    finally {
      setIsBusy(false);
      if (appState !== 'sleeping') { setStatus('Hold to speak'); armSilence(); }
    }
  }

  async function stopSound() {
    if (!soundRef.current) return;
    try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
    soundRef.current = null;
  }

  function armSilence() {
    clearTimeout(s1Ref.current); clearTimeout(s2Ref.current);
    s1Ref.current = setTimeout(async () => {
      if (isBusy || isRecording) return;
      const n = await generateSilencePrompt(character);
      addMsg('assistant', n);
      await speak(n);
    }, SILENCE_NUDGE);
    s2Ref.current = setTimeout(async () => {
      if (isBusy || isRecording) return;
      await doClose();
    }, SILENCE_CLOSE);
  }

  async function doClose() {
    clearTimeout(s1Ref.current); clearTimeout(s2Ref.current);
    setIsBusy(true);
    const t = await generateClose(character, historyRef.current);
    addMsg('assistant', t);
    await speak(t);
    enterSleep();
  }

  function enterSleep() {
    setAppState('sleeping');
    setStatus('Say "Pea Pods" to continue');
    setIsBusy(false);
    deactivateKeepAwake();
    Animated.timing(sleepOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }

  const startRec = useCallback(async () => {
    if (isBusy && appState !== 'sleeping') return;
    clearTimeout(s1Ref.current); clearTimeout(s2Ref.current);
    try {
      await stopSound();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { status: perm } = await Audio.requestPermissionsAsync();
      if (perm !== 'granted') { Alert.alert('Microphone', 'Allow microphone in Settings → CoPea.'); return; }
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setStatus(appState === 'sleeping' ? 'Say "Pea Pods"…' : 'Listening…');
      Animated.loop(Animated.sequence([
        Animated.timing(micScale, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(micScale, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
      ])).start();
    } catch { setStatus('Hold to speak'); }
  }, [isBusy, appState, micScale]);

  const stopRec = useCallback(async () => {
    if (!recordingRef.current) return;
    micScale.stopAnimation();
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
    setIsRecording(false); setIsBusy(true); setStatus('Transcribing…');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      const text = await transcribe(uri);
      if (!text) throw new Error('Nothing heard');

      if (appState === 'sleeping') {
        const lower = text.toLowerCase().replace(/[^a-z]/g, '');
        if (lower.includes('copea') || lower.includes('copea')) {
          setAppState('active');
          Animated.timing(sleepOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
          activateKeepAwakeAsync();
          const w = await generateWakeResponse(character);
          addMsg('assistant', w);
          await speak(w);
        } else { setStatus('Say "Pea Pods" to continue'); setIsBusy(false); }
        return;
      }

      addMsg('user', text);
      historyRef.current = [...historyRef.current, { role: 'user', content: text }];
      if (historyRef.current.length > 40) historyRef.current = historyRef.current.slice(-28);

      setStatus('Thinking…');
      const response = await generateResponse(character, historyRef.current);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: response }];
      addMsg('assistant', response);
      await speak(response);
      if (response.toLowerCase().includes('bye for now')) enterSleep();
    } catch { setStatus('Hold to speak'); setIsBusy(false); }
  }, [appState, character, micScale]);

  async function safeStop() {
    if (!recordingRef.current) return;
    try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
    recordingRef.current = null;
  }

  function addMsg(role, content) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  const isSleeping = appState === 'sleeping';
  const micDisabled = (isBusy && !isRecording) && !isSleeping;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <Text style={s.cEmoji}>{character.emoji}</Text>
          <View>
            <Text style={[s.cName, { color: character.colorText }]}>{character.name}</Text>
            <Text style={s.timerText}>{fmtTime(seconds)}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.endBtn} onPress={() => Alert.alert('End session', 'End this conversation?', [
          { text: 'Keep going', style: 'cancel' },
          { text: 'End session', style: 'destructive', onPress: onEnd },
        ])}>
          <Text style={s.endBtnText}>End</Text>
        </TouchableOpacity>
      </View>

      {!!headline && (
        <View style={[s.newsBanner, { borderColor: character.color+'25', backgroundColor: character.colorDim }]}>
          <Text style={s.newsLabel}>TODAY</Text>
          <Text style={s.newsText} numberOfLines={2}>{headline}</Text>
        </View>
      )}

      <ScrollView ref={scrollRef} style={s.msgs} contentContainerStyle={s.msgsContent} showsVerticalScrollIndicator={false}>
        {messages.map(m => (
          <View key={m.id} style={[
            s.bubble,
            m.role === 'assistant'
              ? [s.bubbleChar, { borderColor: character.color+'28', backgroundColor: character.colorDim }]
              : s.bubbleUser,
          ]}>
            {m.role === 'assistant' && <Text style={s.bubbleEmoji}>{character.emoji}</Text>}
            <Text style={[s.bubbleText, m.role === 'assistant' && { color: '#D8EDE5' }]}>{m.content}</Text>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={s.bottom}>
        {isSleeping && (
          <Animated.View style={[s.sleepWrap, { opacity: sleepOpacity }]}>
            <Text style={s.sleepEmoji}>{character.emoji}</Text>
            <Text style={s.sleepTitle}>Sleeping</Text>
            <Text style={s.sleepHint}>Hold mic and say "Pea Pods" to continue</Text>
          </Animated.View>
        )}
        {!isSleeping && <Text style={[s.statusText, isRecording && { color: character.colorText }]}>{status}</Text>}
        <Animated.View style={{ transform: [{ scale: micScale }] }}>
          <TouchableOpacity
            style={[s.micBtn, {
              borderColor:     isRecording ? character.color : 'rgba(255,255,255,0.09)',
              backgroundColor: isRecording ? character.colorDim : 'rgba(255,255,255,0.03)',
              shadowColor:     character.colorGlow,
              shadowOpacity:   isRecording ? 0.75 : 0,
            }, micDisabled && { opacity: 0.35 }]}
            onPressIn={startRec} onPressOut={stopRec}
            activeOpacity={1} disabled={micDisabled}
          >
            <Text style={s.micIcon}>{isRecording ? '🔴' : isSleeping ? '💤' : '🎙'}</Text>
          </TouchableOpacity>
        </Animated.View>
        {!isSleeping && <Text style={s.micHint}>{micDisabled ? '—' : 'Hold to speak'}</Text>}
      </View>
    </SafeAreaView>
  );
}

const C = { bg: '#060E0B', surface: '#0C1A15', border: 'rgba(255,255,255,0.07)', text: '#D4E8DF', text2: '#466057', text3: '#1E3329' };

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cEmoji: { fontSize: 28, lineHeight: 34 },
  cName:  { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  timerText: { fontSize: 11, color: C.text2, fontWeight: '500', letterSpacing: 0.5, marginTop: 1 },
  endBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,75,110,0.25)', backgroundColor: 'rgba(255,75,110,0.06)' },
  endBtnText: { color: '#FF4B6E', fontSize: 13, fontWeight: '600' },
  newsBanner: { marginHorizontal: 16, marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  newsLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: C.text2, marginBottom: 3, textTransform: 'uppercase' },
  newsText:  { fontSize: 12, color: '#8FBFAA', lineHeight: 17 },
  msgs: { flex: 1 },
  msgsContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  bubble:    { borderRadius: 16, padding: 14, maxWidth: '92%', borderWidth: 1 },
  bubbleChar:{ alignSelf: 'flex-start', flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bubbleUser:{ alignSelf: 'flex-end', backgroundColor: C.surface, borderColor: C.border },
  bubbleEmoji: { fontSize: 18, lineHeight: 24, flexShrink: 0 },
  bubbleText:  { fontSize: 14, lineHeight: 21, color: C.text, flex: 1 },
  bottom: { alignItems: 'center', paddingBottom: 32, paddingTop: 16, gap: 12, borderTopWidth: 1, borderTopColor: C.border },
  sleepWrap: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  sleepEmoji:{ fontSize: 40, marginBottom: 4 },
  sleepTitle:{ fontSize: 22, fontWeight: '200', color: C.text, letterSpacing: -0.5 },
  sleepHint: { fontSize: 12, color: C.text2, textAlign: 'center', lineHeight: 18 },
  statusText:{ fontSize: 12, color: C.text2, fontWeight: '500', letterSpacing: 0.3 },
  micBtn: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowRadius: 20 },
  micIcon: { fontSize: 36 },
  micHint: { fontSize: 11, color: C.text3, fontWeight: '500' },
});
