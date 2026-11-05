import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const GAME_URL = process.env.EXPO_PUBLIC_GAME_URL || 'https://play-pokeworld.github.io/';
const GAME_ORIGIN = new URL(GAME_URL).origin;

function GameShell() {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const retry = () => {
    setHasError(false);
    webView.current?.reload();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor="#161616" />
      <View style={styles.webViewShell}>
        <WebView
          ref={webView}
          source={{ uri: GAME_URL }}
          originWhitelist={['https://*']}
          onShouldStartLoadWithRequest={(request) => {
            let origin = '';
            try { origin = new URL(request.url).origin; } catch { /* Invalid navigation is blocked. */ }
            if (request.url === 'about:blank' || origin === GAME_ORIGIN) return true;
            if (/^https?:|^mailto:|^tel:/.test(request.url)) void Linking.openURL(request.url).catch(() => undefined);
            return false;
          }}
          onNavigationStateChange={(state) => { setCanGoBack(state.canGoBack); setHasError(false); }}
          onError={() => setHasError(true)}
          onHttpError={(event) => { if (event.nativeEvent.statusCode >= 500) setHasError(true); }}
          onContentProcessDidTerminate={() => webView.current?.reload()}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          style={styles.webView}
        />
        {hasError && (
          <View style={styles.errorPane}>
            <Text style={styles.title}>PokéWorld is temporarily unavailable</Text>
            <Text style={styles.message}>Check your connection, then try again.</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><GameShell /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#161616' },
  webViewShell: { flex: 1 },
  webView: { flex: 1, backgroundColor: '#161616' },
  errorPane: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12, backgroundColor: '#171612' },
  title: { color: '#f4e9ca', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  message: { color: '#c3bda9', fontSize: 15, textAlign: 'center' },
  retry: { minHeight: 48, minWidth: 116, justifyContent: 'center', alignItems: 'center', marginTop: 8, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#cf7b22' },
  retryText: { color: '#17130e', fontSize: 16, fontWeight: '700' }
});
