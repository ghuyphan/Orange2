import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';

export default function HomeLayout() {

  return (
    <ThemedView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios',
        }}
      >
        <Stack.Screen name="home"/>
        <Stack.Screen name="(add)" />
        <Stack.Screen name="(detail)" />
        <Stack.Screen name="(scan)"/>
        <Stack.Screen name="empty"/>
      </Stack>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    right: 15,
    zIndex: 10,
  },
});