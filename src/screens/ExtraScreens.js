/**
 * Pea Pods — Character Select + Subscribe Screens
 * Character animations play on loop, no audio.
 */

import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, SafeAreaView, Linking, Image,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { CHARACTERS, CHARACTER_LIST } from '../characters';

const CHARACTER_VIDEOS = {
  pea_male:   require('../../assets/characters/pea_male.mp4'),
  pea_female: require('../../assets/characters/pea_female.mp4'),
  pooh:       require('../../assets/characters/pooh.mp4'),
  sasquatch:  require('../../assets/characters/sasquatch.mp4'),
  narrator:   require('../../assets/characters/narrator.mp4'),
  godfather:  require('../../assets/characters/godfather.mp4'),
  dj_sweet:   require('../../assets/characters/dj_sweet.mp4'),
  sensei:     require('../../assets/characters/sensei.mp4'),
  tinker:     require('../../assets/characters/tinker.mp4'),
  holmes:     require('../../assets/characters/holmes.mp4'),
};

function CharacterCard({ char, onSelect, scale }) {
  const video = CHARACTER_VIDEOS[char.id];
  return (
    <Animated.View style={[s.cardWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[s.card, { borderColor: char.color + '60' }]}
        onPress={() => onSelect(char)}
        activeOpacity={0.9}
      >
        {video ? (
          <Video
            source={video}
            style={s.charVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            useNativeControls={false}
          />
        ) : (
          <View style={[s.charVideo, s.emojiFallback, { backgroundColor: char.colorDim }]}>
            <Text style={s.emojiLarge}>{char.avatarEmoji}</Text>
          </View>
        )}
        <View style={[s.cardFooter, { backgroundColor: char.colorDim }]}>
          <Text style={[s.cardName, { color: char.colorText }]}>{char.name}</Text>
          <Text style={s.cardTagline} numberOfLines={2}>{char.tagline}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CharacterScreen({ onSelect, onBack, mode }) {
  const anims = useRef(
    CHARACTER_LIST.reduce((a, id) => { a[id] = new Animated.Value(1); return a; }, {})
  ).current;

  const modeLabel = mode === 'live' ? 'Live News Pod' : 'Three Peas in a Pod';
  const modeSub   = mode === 'live'
    ? 'Opens with today\'s news · Say "Pea Pods" to wake after goodbye'
    : 'This character listens and speaks after silence';

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>{modeLabel}</Text>
        <Text style={s.sub}>{modeSub}</Text>
      </View>
      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {CHARACTER_LIST.map(id => (
          <CharacterCard
            key={id}
            char={CHARACTERS[id]}
            onSelect={onSelect}
            scale={anims[id]}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SubscribeScreen({ onBack }) {
  const includes = [
    'Live News Pod — debate today\'s news with any of 10 characters',
    'Three Peas in a Pod — AI joins your conversations',
    'All 10 animated characters unlocked',
    'Fresh news story every morning',
    'Always-on listening in Three Peas',
    'Wake word — say "Pea Pods" to resume',
  ];

  return (
    <SafeAreaView style={sub.root}>
      <View style={sub.inner}>
        <Image source={require('../../assets/PeaPods_title.png')} style={sub.logo} resizeMode="contain" />
        <Text style={sub.desc}>Your 3-day free trial has ended.</Text>
        <View style={sub.card}>
          <Text style={sub.planName}>Weekly Plan</Text>
          <Text style={sub.planPrice}>£1.99<Text style={sub.planPer}>/week</Text></Text>
          <View style={sub.divider} />
          <Text style={sub.includesTitle}>What's included</Text>
          {includes.map(i => (
            <View key={i} style={sub.row}>
              <Text style={sub.dot}>·</Text>
              <Text style={sub.item}>{i}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={sub.btn} onPress={() => Linking.openURL('https://yourwebsite.com/subscribe')} activeOpacity={0.85}>
          <Text style={sub.btnText}>Subscribe — £1.99/week →</Text>
        </TouchableOpacity>
        <Text style={sub.legal}>Cancel anytime. Billed weekly through the App Store.{'\n'}Two Peas in a Pod remains free forever.</Text>
        <TouchableOpacity onPress={onBack} style={sub.backBtn}>
          <Text style={sub.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const C = { bg: '#060E0B', surface: '#0C1A15', border: 'rgba(255,255,255,0.07)', green: '#1DB87A', text: '#D8EDE5', text2: '#466057', text3: '#1E3329' };

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
  back:   { fontSize: 14, color: C.green, fontWeight: '500', marginBottom: 6 },
  title:  { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  sub:    { fontSize: 12, color: C.text2, lineHeight: 17 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40, gap: 12, justifyContent: 'space-between' },
  cardWrap:     { width: '47%' },
  card:         { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  charVideo:    { width: '100%', aspectRatio: 1, backgroundColor: '#000' },
  emojiFallback:{ alignItems: 'center', justifyContent: 'center' },
  emojiLarge:   { fontSize: 64 },
  cardFooter:   { padding: 10, gap: 3 },
  cardName:     { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  cardTagline:  { fontSize: 10, color: C.text2, lineHeight: 14 },
});

const sub = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  logo:  { width: '75%', height: 80 },
  desc:  { fontSize: 14, color: C.text2, textAlign: 'center' },
  card:  { width: '100%', backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, gap: 8, alignItems: 'center' },
  planName:      { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 1, textTransform: 'uppercase' },
  planPrice:     { fontSize: 36, fontWeight: '200', color: C.text, letterSpacing: -1 },
  planPer:       { fontSize: 14, color: C.text2 },
  divider:       { width: '100%', height: 1, backgroundColor: C.border },
  includesTitle: { fontSize: 10, fontWeight: '700', color: C.text2, letterSpacing: 1, textTransform: 'uppercase', alignSelf: 'flex-start' },
  row:     { flexDirection: 'row', gap: 8, alignSelf: 'flex-start' },
  dot:     { color: C.green, fontSize: 14 },
  item:    { fontSize: 12, color: C.text2, flex: 1, lineHeight: 17 },
  btn:     { width: '100%', backgroundColor: C.green, paddingVertical: 17, borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#060E0B', fontSize: 15, fontWeight: '700' },
  legal:   { fontSize: 11, color: C.text3, textAlign: 'center', lineHeight: 16 },
  backBtn: { marginTop: 4 },
  backText:{ fontSize: 14, color: C.text2 },
});
