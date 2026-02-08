import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import SplashScreenView from './splash';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_600SemiBold
} from '@expo-google-fonts/fredoka';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold
} from '@expo-google-fonts/outfit';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isSplashTimerDone, setIsSplashTimerDone] = useState(false);

  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  // Phase 1: Splash Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashTimerDone(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Hide the native splash screen when the app is ready to show our custom splash
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Phase 2: Auth Guard
  useEffect(() => {
    if (authLoading || !isSplashTimerDone || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, authLoading, segments, isSplashTimerDone, fontsLoaded]);

  // If splash isn't done or fonts aren't loaded, show the custom animation
  if (!isSplashTimerDone || !fontsLoaded) {
    return <SplashScreenView />;
  }

  // Final check before showing content
  if (authLoading) return null;

  return <Slot />;
}
