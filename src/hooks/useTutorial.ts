import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useTutorial(gameId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? 'guest';
  const key = `@tutorial_seen_v1_${gameId}_${userId}`;

  const [showTutorial, setShowTutorial] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((val) => {
      setShowTutorial(val !== 'true');
      setLoaded(true);
    });
  }, [key]);

  const dismissTutorial = () => {
    setShowTutorial(false);
    AsyncStorage.setItem(key, 'true');
  };

  const reopenTutorial = () => setShowTutorial(true);

  return { showTutorial: loaded && showTutorial, dismissTutorial, reopenTutorial };
}
