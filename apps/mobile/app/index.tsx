import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isAuthenticated, loadStoredToken } from '../lib/api';

/** Root `/` — send learner to login or home */
export default function Index() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    loadStoredToken().then(() => {
      setAuthed(isAuthenticated());
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return <Redirect href={authed ? '/(tabs)/home' : '/login'} />;
}
