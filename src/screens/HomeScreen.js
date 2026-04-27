/**
 * Pea Pods — Home Screen with intro video splash
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, SafeAreaView, ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar }          from 'expo-status-bar';
import { trialDaysRemaining } from '../services/trial';

export default function HomeScreen({ onTwoPeas, onThreePeas, onLiveNews, onSettings }) {
  const [showIntro, setShowIntro] = useState(true);
  const [days,      setDays]      = useState(null);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    trialDaysRemaining().then(setDays);
  }, []);

  const onIntroEnd = () => {
    Animated.timing(introOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
      setShowIntro(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  };

  const trialLabel = () => {
    if (days === null) return '';
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} free trial remaining`;
    return 'Free trial ended · Subscribe to continue';
  };

  const isPaid = days !== null && days === 0;

  // ── INTRO SPLASH ──
  if (showIntro) {
    return (
      <Animated.View style={[s.introWrap, { opacity: introOpacity }]}>
        <Video
          source={require('../../assets/intro.mp4')}
          style={s.introVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted
          useNativeControls={false}
          onPlaybackStatusUpdate={status => {
            if (status.didJustFinish) onIntroEnd();
          }}
        />
        <TouchableOpacity style={s.skipBtn} onPress={onIntroEnd}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── MAIN HOME ──
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logo}>Pea<Text style={s.logoPods}> Pods</Text></Text>
          <Text style={s.tagline}>Three pods. One pair of earphones.</Text>
        </View>

        {/* ── 1. TWO PEAS IN A POD ── */}
        <TouchableOpacity style={[s.card, s.cardGreen]} onPress={onTwoPeas} activeOpacity={0.85}>
          <View style={s.cardHeader}>
            <Text style={s.cardEmoji}>🫛🫛</Text>
            <View style={s.freeBadge}><Text style={s.freeBadgeText}>FREE · ALWAYS</Text></View>
          </View>
          <Text style={s.cardTitle}>Two Peas in a Pod</Text>
          <Text style={s.cardDesc}>Two people. One pair of earphones. Talk to each other in real time — no AI, no delays, always on.</Text>
          <Text style={s.cardArrow}>Start talking →</Text>
        </TouchableOpacity>

        {/* ── 2. THREE PEAS IN A POD ── */}
        <TouchableOpacity style={[s.card, s.cardBlue]} onPress={onThreePeas} activeOpacity={0.85}>
          <View style={s.cardHeader}>
            <Text style={s.cardEmoji}>🫛🫛🫛</Text>
            <View style={s.subBadge}><Text style={s.subBadgeText}>£1.99 / WEEK</Text></View>
          </View>
          <Text style={s.cardTitle}>Three Peas in a Pod</Text>
          <Text style={s.cardDesc}>Two people talk. An AI character listens and speaks only after silence — one observation at a time.</Text>
          {days !== null && days > 0 && <Text style={s.trialNote}>{trialLabel()}</Text>}
          <Text style={[s.cardArrow, { color: '#7EC8F5' }]}>{isPaid ? 'Subscribe to unlock →' : 'Choose a character →'}</Text>
        </TouchableOpacity>

        {/* ── 3. LIVE NEWS POD ── */}
        <TouchableOpacity style={[s.card, s.cardGold]} onPress={onLiveNews} activeOpacity={0.85}>
          <View style={s.cardHeader}>
            <Text style={s.cardEmoji}>📰🫛</Text>
            <View style={s.subBadge}><Text style={s.subBadgeText}>£1.99 / WEEK</Text></View>
          </View>
          <Text style={s.cardTitle}>Live News Pod</Text>
          <Text style={s.cardDesc}>One person. One AI character. Today's real news opens the debate.</Text>
          <View style={s.charRow}>
            {['🫛','🫛','🐻','🦧','📖','🎩','🎧','🧘','✨','🔍'].map((e, i) => (
              <Text key={i} style={s.charEmoji}>{e}</Text>
            ))}
          </View>
          {days !== null && days > 0 && <Text style={[s.trialNote, { color: '#D4A84B' }]}>{trialLabel()}</Text>}
          <Text style={[s.cardArrow, { color: '#F5C842' }]}>{isPaid ? 'Subscribe to unlock →' : 'Choose a character →'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.settingsBtn} onPress={onSettings}>
          <Text style={s.settingsBtnText}>⚙  Settings · News topics · Character preferences</Text>
        </TouchableOpacity>

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const C = { bg: '#060E0B', surface: '#0C1A15', border: 'rgba(255,255,255,0.07)', green: '#1DB87A', text: '#D8EDE5', text2: '#466057', text3: '#1E3329' };

const s = StyleSheet.create({
  introWrap:  { flex: 1, backgroundColor: '#000' },
  introVideo: { flex: 1, width: '100%', height: '100%' },
  skipBtn:    { position: 'absolute', bottom: 50, right: 24, paddingVertical: 8, paddingHorizontal: 18, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  skipText:   { color: '#fff', fontSize: 13, fontWeight: '500' },

  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40, gap: 14 },

  logoWrap: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  logo:     { fontSize: 48, fontWeight: '200', color: C.text, letterSpacing: -1 },
  logoPods: { color: C.green },
  tagline:  { fontSize: 12, color: C.text2, textAlign: 'center' },

  card:      { borderRadius: 22, borderWidth: 1.5, padding: 20, gap: 10, backgroundColor: C.surface },
  cardGreen: { borderColor: 'rgba(29,184,122,0.4)' },
  cardBlue:  { borderColor: 'rgba(126,200,245,0.3)' },
  cardGold:  { borderColor: 'rgba(212,146,10,0.3)' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEmoji:  { fontSize: 28, letterSpacing: -4 },
  cardTitle:  { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  cardDesc:   { fontSize: 13, color: C.text2, lineHeight: 19 },
  cardArrow:  { fontSize: 14, fontWeight: '600', color: C.green },

  freeBadge:     { backgroundColor: 'rgba(29,184,122,0.15)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(29,184,122,0.3)' },
  freeBadgeText: { fontSize: 9, fontWeight: '700', color: C.green, letterSpacing: 1 },
  subBadge:      { backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)' },
  subBadgeText:  { fontSize: 9, fontWeight: '700', color: '#F5C842', letterSpacing: 1 },

  trialNote: { fontSize: 11, color: C.green, fontWeight: '500' },
  charRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  charEmoji: { fontSize: 20 },

  settingsBtn:     { alignItems: 'center', paddingVertical: 12 },
  settingsBtnText: { fontSize: 12, color: C.text2 },
});
