/**
 * CoPea — Settings Screen
 * All toggles in one place.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Switch,
} from 'react-native';
import { StatusBar }              from 'expo-status-bar';
import { CHARACTERS, CHARACTER_LIST } from '../characters';
import { getAllSettings, saveSetting } from '../services/settings';
import { ALL_TOPICS }             from '../services/news';

export default function SettingsScreen({ onBack }) {
  const [settings, setSettings] = useState(null);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => { getAllSettings().then(setSettings); }, []);

  if (!settings) return (
    <SafeAreaView style={s.root}>
      <View style={s.center}><Text style={s.loading}>Loading…</Text></View>
    </SafeAreaView>
  );

  const update = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await saveSetting(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const toggleTopic = async (id) => {
    const current = settings.topics;
    const next = current.includes(id)
      ? current.length > 1 ? current.filter(t => t !== id) : current
      : [...current, id];
    update('topics', next);
  };

  const Toggle = ({ value, onToggle }) => (
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#1E3329', true: 'rgba(29,184,122,0.4)' }}
      thumbColor={value ? '#1DB87A' : '#466057'}
      ios_backgroundColor="#1E3329"
    />
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <View style={s.headerRow}>
          <Text style={s.title}>Settings</Text>
          {saved && <Text style={s.savedText}>Saved ✓</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── AUDIO ── */}
        <Text style={s.section}>Audio</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Noise Cancellation</Text>
              <Text style={s.rowDesc}>Suppress background noise during calls</Text>
            </View>
            <Toggle value={settings.noiseCancel} onToggle={v => update('noiseCancel', v)} />
          </View>
          <View style={[s.row, s.rowBorder]}>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Echo Cancellation</Text>
              <Text style={s.rowDesc}>Prevent audio feedback loop</Text>
            </View>
            <Toggle value={settings.echoCancel} onToggle={v => update('echoCancel', v)} />
          </View>
        </View>

        {/* ── SOLO MODE ── */}
        <Text style={s.section}>Solo Mode</Text>
        <View style={s.card}>
          <Text style={s.cardLabel}>Default Character</Text>
          <View style={s.charPicker}>
            {CHARACTER_LIST.map(id => {
              const c = CHARACTERS[id];
              const selected = settings.soloCharacter === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[s.charOption, selected && { borderColor: c.color, backgroundColor: c.colorDim }]}
                  onPress={() => update('soloCharacter', id)}
                  activeOpacity={0.75}
                >
                  <Text style={s.charOptionEmoji}>{c.emoji}</Text>
                  <Text style={[s.charOptionName, selected && { color: c.colorText }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── TRIO MODE ── */}
        <Text style={s.section}>Trio Mode</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Enable Trio Mode</Text>
              <Text style={s.rowDesc}>AI character joins Connect conversations</Text>
            </View>
            <Toggle value={settings.trioEnabled} onToggle={v => update('trioEnabled', v)} />
          </View>

          {settings.trioEnabled && (
            <>
              <View style={[s.row, s.rowBorder]}>
                <View style={s.rowInfo}>
                  <Text style={s.rowTitle}>Silence Before AI Speaks</Text>
                  <Text style={s.rowDesc}>{settings.trioSilence} seconds of silence</Text>
                </View>
                <View style={s.silenceButtons}>
                  {[5, 8, 12, 15].map(sec => (
                    <TouchableOpacity
                      key={sec}
                      style={[s.secBtn, settings.trioSilence === sec && s.secBtnOn]}
                      onPress={() => update('trioSilence', sec)}
                    >
                      <Text style={[s.secBtnText, settings.trioSilence === sec && s.secBtnTextOn]}>
                        {sec}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[s.rowBorder, { paddingTop: 14 }]}>
                <Text style={s.cardLabel}>Trio Character</Text>
                <View style={[s.charPicker, { marginTop: 10 }]}>
                  {CHARACTER_LIST.map(id => {
                    const c = CHARACTERS[id];
                    const selected = settings.trioCharacter === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[s.charOption, selected && { borderColor: c.color, backgroundColor: c.colorDim }]}
                        onPress={() => update('trioCharacter', id)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.charOptionEmoji}>{c.emoji}</Text>
                        <Text style={[s.charOptionName, selected && { color: c.colorText }]}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── NEWS TOPICS ── */}
        <Text style={s.section}>News Topics</Text>
        <Text style={s.sectionDesc}>Solo Mode opens each session with a story from these topics.</Text>
        <View style={s.card}>
          {ALL_TOPICS.map((topic, i) => {
            const on = settings.topics.includes(topic.id);
            return (
              <TouchableOpacity
                key={topic.id}
                style={[s.topicRow, i > 0 && s.rowBorder, on && s.topicRowOn]}
                onPress={() => toggleTopic(topic.id)}
                activeOpacity={0.75}
              >
                <Text style={[s.topicLabel, on && { color: '#D8EDE5' }]}>{topic.label}</Text>
                <View style={[s.pill, on && s.pillOn]}>
                  <Text style={[s.pillText, on && s.pillTextOn]}>{on ? 'ON' : 'OFF'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.hint}>At least one topic must stay on.</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const C = {
  bg: '#060E0B', surface: '#0C1A15', border: 'rgba(255,255,255,0.07)',
  green: '#1DB87A', greenDim: 'rgba(29,184,122,0.12)',
  text: '#D8EDE5', text2: '#466057', text3: '#1E3329',
};

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: C.text2, fontSize: 14 },
  header:  { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  back:    { fontSize: 14, color: C.green, fontWeight: '500' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:   { fontSize: 28, fontWeight: '200', color: C.text, letterSpacing: -1 },
  savedText: { fontSize: 12, color: C.green, fontWeight: '600' },
  scroll:  { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 10 },
  section: { fontSize: 13, fontWeight: '700', color: C.text2, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 6 },
  sectionDesc: { fontSize: 12, color: C.text3, marginTop: -6 },
  card:    { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 0 },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.text2 },
  row:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  rowInfo: { flex: 1, paddingRight: 12 },
  rowTitle:{ fontSize: 15, fontWeight: '500', color: C.text, marginBottom: 2 },
  rowDesc: { fontSize: 12, color: C.text2 },
  charPicker: { flexDirection: 'row', gap: 8, marginTop: 8 },
  charOption: { flex: 1, backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, padding: 10, alignItems: 'center', gap: 4 },
  charOptionEmoji: { fontSize: 22 },
  charOptionName:  { fontSize: 11, fontWeight: '600', color: C.text2 },
  silenceButtons:  { flexDirection: 'row', gap: 6 },
  secBtn:     { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  secBtnOn:   { backgroundColor: 'rgba(29,184,122,0.15)', borderColor: C.green },
  secBtnText: { fontSize: 12, color: C.text2, fontWeight: '600' },
  secBtnTextOn: { color: C.green },
  topicRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  topicRowOn: { },
  topicLabel: { fontSize: 14, color: C.text2 },
  pill:     { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20, backgroundColor: C.border },
  pillOn:   { backgroundColor: 'rgba(29,184,122,0.2)' },
  pillText: { fontSize: 10, fontWeight: '700', color: C.text3, letterSpacing: 1 },
  pillTextOn: { color: C.green },
  hint:     { textAlign: 'center', fontSize: 12, color: C.text3 },
});
