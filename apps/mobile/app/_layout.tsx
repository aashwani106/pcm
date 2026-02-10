import { Redirect, Slot, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import SplashScreenView from './splash';
import * as SplashScreen from 'expo-splash-screen';
import { getMyProfile, MyProfile } from '../services/profile';
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

function getRoleHomePath(role: MyProfile['role'] | undefined) {
  if (role === 'admin') return '/(admin)';
  if (role === 'student') return '/(student)';
  if (role === 'parent') return '/(parent)';
  return '/login';
}

export default function RootLayout() {
  const { session, loading: authLoading } = useAuth();
  const segments = useSegments();
  const [isSplashTimerDone, setIsSplashTimerDone] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

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

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const currentProfile = await getMyProfile(session.user.id, session.user.email);
        setProfile(currentProfile);
      } catch {
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [session?.user?.id]);

  // If splash isn't done or fonts aren't loaded, show the custom animation
  if (!isSplashTimerDone || !fontsLoaded) {
    return <SplashScreenView />;
  }

  // Final check before showing content
  if (authLoading || profileLoading) return null;

  const inAuthGroup = segments[0] === '(auth)';
  const inForceGroup = segments[0] === '(force)';

  if (!session) {
    if (!inAuthGroup) {
      return <Redirect href="/login" />;
    }
    return <Slot />;
  }

  if (profile?.must_change_password) {
    if (!inForceGroup) {
      return <Redirect href="/change-password" />;
    }
    return <Slot />;
  }

  if (inForceGroup || inAuthGroup) {
    return <Redirect href={getRoleHomePath(profile?.role) as never} />;
  }

  return <Slot />;
}
