/**
 * Pea Pods — Intro Screen
 * Plays the 6-second intro video on first launch only.
 * After first launch goes straight to home screen.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_KEY = 'peapods_intro_seen';

export default function IntroScreen({ onDone }) {
  const videoRef = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  async function checkIfShouldShow() {
    try {
      const seen = await AsyncStorage.getItem(INTRO_KEY);
      if (seen) {
        onDone(); // Already seen — go straight to home
      } else {
        setShow(true); // First time — show intro
        await AsyncStorage.setItem(INTRO_KEY, '1');
      }
    } catch {
      onDone();
    }
  }

  if (!show) return <View style={s.root} />;

  return (
    <TouchableOpacity style={s.root} onPress={onDone} activeOpacity={1}>
      <Video
        ref={videoRef}
        source={require('../../assets/intro.mp4')}
        style={s.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={status => {
          if (status.didJustFinish) onDone();
        }}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, width: '100%', height: '100%' },
});
