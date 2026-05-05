import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  fetchUrl: () => Promise<string>;
  title: string;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ fetchUrl, title }: Props) {
  const { tokens } = useTheme();

  const [url, setUrl]           = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoadingUrl(true);
    setError('');
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const u = await fetchUrl();
      setUrl(u);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load audio.');
    } finally {
      setLoadingUrl(false);
    }
  }, [fetchUrl]);

  useEffect(() => { load(); }, [load]);

  if (loadingUrl) {
    return (
      <View style={shell(tokens)}>
        <ActivityIndicator color={tokens.accent} />
        <Text style={{ color: tokens.textMuted, fontSize: 13, marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  if (error || !url) {
    return (
      <View style={shell(tokens)}>
        <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
          {error || 'Could not load audio.'}
        </Text>
        <Pressable
          onPress={load}
          style={({ pressed }) => ({
            backgroundColor: tokens.btnPrimaryBg, borderRadius: 8,
            paddingVertical: 8, paddingHorizontal: 18, opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: tokens.btnPrimaryText, fontWeight: '600', fontSize: 13 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return <PlayerControls url={url} title={title} tokens={tokens} />;
}

// Separate component so useAudioPlayer only mounts once we have the URL
function PlayerControls({ url, title, tokens }: { url: string; title: string; tokens: any }) {
  const player = useAudioPlayer({ uri: url }, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const position = status.currentTime ?? 0;          // seconds
  const duration = status.duration ?? 0;             // seconds
  const isPlaying = status.playing ?? false;
  const isBuffering = status.isBuffering ?? false;
  const progress = duration > 0 ? position / duration : 0;

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const skipBy = (sec: number) => {
    const next = Math.max(0, Math.min(duration, position + sec));
    player.seekTo(next);
  };

  const seek = (fraction: number) => {
    player.seekTo(fraction * duration);
  };

  return (
    <View style={{
      backgroundColor: tokens.cardBg,
      borderColor: tokens.cardBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      gap: 16,
    }}>
      <Text
        style={{ fontSize: 14, fontWeight: '600', color: tokens.textPrimary, textAlign: 'center' }}
        numberOfLines={2}
      >
        {title}
      </Text>

      <Scrubber progress={progress} onSeek={seek} tokens={tokens} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: tokens.textMuted }}>
          {formatTime(position)}
        </Text>
        <Text style={{ fontSize: 11, color: tokens.textMuted }}>
          {duration > 0 ? formatTime(duration) : '--:--'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <Pressable onPress={() => skipBy(-15)} hitSlop={12}>
          {({ pressed }) => (
            <View style={{ alignItems: 'center', opacity: pressed ? 0.5 : 1 }}>
              <Text style={{ fontSize: 24, color: tokens.textSecondary }}>↺</Text>
              <Text style={{ fontSize: 9, color: tokens.textMuted, marginTop: -4 }}>15</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={togglePlay} disabled={isBuffering}>
          {({ pressed }) => (
            <View style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: tokens.btnPrimaryBg,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            }}>
              {isBuffering ? (
                <ActivityIndicator color={tokens.btnPrimaryText} />
              ) : (
                <Text style={{ fontSize: 24, color: tokens.btnPrimaryText, marginLeft: isPlaying ? 0 : 3 }}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              )}
            </View>
          )}
        </Pressable>

        <Pressable onPress={() => skipBy(15)} hitSlop={12}>
          {({ pressed }) => (
            <View style={{ alignItems: 'center', opacity: pressed ? 0.5 : 1 }}>
              <Text style={{ fontSize: 24, color: tokens.textSecondary }}>↻</Text>
              <Text style={{ fontSize: 9, color: tokens.textMuted, marginTop: -4 }}>15</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Scrubber({ progress, onSeek, tokens }: {
  progress: number;
  onSeek: (fraction: number) => void;
  tokens: any;
}) {
  const [barWidth, setBarWidth] = useState(0);

  return (
    <Pressable
      onPress={(e) => {
        if (!barWidth) return;
        onSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth)));
      }}
      style={{ height: 28, justifyContent: 'center' }}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{ height: 4, backgroundColor: tokens.btnBgPressed, borderRadius: 2 }}
      >
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress * 100}%`,
          backgroundColor: tokens.accent,
          borderRadius: 2,
        }} />
        <View style={{
          position: 'absolute',
          left: `${progress * 100}%` as any,
          top: '50%' as any,
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: tokens.accent,
          marginLeft: -7, marginTop: -7,
        }} />
      </View>
    </Pressable>
  );
}

function shell(tokens: any) {
  return {
    backgroundColor: tokens.cardBg,
    borderColor: tokens.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    gap: 8,
  };
}
