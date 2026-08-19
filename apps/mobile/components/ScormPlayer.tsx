import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import { saveScormProgress } from '../lib/api';
import { useSyncQueueStore } from '../stores/syncQueue.store';
import { useTheme } from '../context/ThemeContext';

interface ScormPlayerProps {
  baseUrl: string;
  entryPoint: string;
  enrollmentId: string;
  moduleId?: string;
}

const SCORM_BRIDGE_JS = `
(function() {
  if (window.__lmsScormBridge) return true;
  window.__lmsScormBridge = true;
  var store = {};
  function post(msg) { try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch(e) {} }
  var API = {
    LMSInitialize: function() { post({method:'LMSInitialize'}); return 'true'; },
    LMSFinish: function() { post({method:'LMSFinish', cmi: store}); return 'true'; },
    LMSGetValue: function(key) { return store[key] || ''; },
    LMSSetValue: function(key, value) { store[key]=String(value); post({method:'LMSSetValue',key:key,value:String(value)}); return 'true'; },
    LMSCommit: function() { post({method:'LMSCommit', cmi: store}); return 'true'; },
    LMSGetLastError: function() { return '0'; },
    LMSGetErrorString: function() { return ''; },
    LMSGetDiagnostic: function() { return ''; },
    Initialize: function() { return API.LMSInitialize(); },
    Terminate: function() { return API.LMSFinish(); },
    GetValue: function(k) { return API.LMSGetValue(k); },
    SetValue: function(k,v) { return API.LMSSetValue(k,v); },
    Commit: function() { return API.LMSCommit(); },
    GetLastError: function() { return '0'; },
    GetErrorString: function() { return ''; },
    GetDiagnostic: function() { return ''; }
  };
  window.API = API;
  window.API_1484_11 = API;
})();
true;
`;

function lessonStatusFromCmi(cmi: Record<string, string>, fallback?: string) {
  return (
    fallback ||
    cmi['cmi.core.lesson_status'] ||
    cmi['cmi.completion_status'] ||
    cmi['cmi.success_status'] ||
    'incomplete'
  );
}

export function ScormPlayer({ baseUrl, entryPoint, enrollmentId, moduleId }: ScormPlayerProps) {
  const { c } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState('Launching…');
  const cmiRef = useRef<Record<string, string>>({});
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayload = useRef<string>('');
  const addItem = useSyncQueueStore((s) => s.addItem);
  const launchUrl = `${baseUrl.replace(/\/$/, '')}/${entryPoint.replace(/^\//, '')}`.replace(
    /([^:]\/)\/+/g,
    '$1',
  );
  const realModuleId = moduleId?.startsWith('scorm-') ? undefined : moduleId;

  const flush = async (finalStatus?: string) => {
    const cmi = cmiRef.current;
    const scoreRaw = cmi['cmi.core.score.raw'] || cmi['cmi.score.raw'] || '';
    const lesson = lessonStatusFromCmi(cmi, finalStatus);
    const score = scoreRaw !== '' ? Number(scoreRaw) : undefined;
    const body = {
      enrollmentId,
      score: Number.isFinite(score) ? score : undefined,
      status: lesson,
      cmiData: cmi,
      moduleId: realModuleId,
    };
    const fingerprint = JSON.stringify({
      status: body.status,
      score: body.score,
      keys: Object.keys(cmi).length,
    });
    if (fingerprint === lastPayload.current && !finalStatus) return;
    lastPayload.current = fingerprint;

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        addItem({ type: 'PROGRESS_UPDATE', payload: { kind: 'scorm', ...body } });
        setStatus('Saved offline — will sync later');
        return;
      }
      await saveScormProgress(body);
      setStatus(`Saved · ${lesson}${score != null && Number.isFinite(score) ? ` · ${score}%` : ''}`);
    } catch (e) {
      addItem({ type: 'PROGRESS_UPDATE', payload: { kind: 'scorm', ...body } });
      setStatus(e instanceof Error ? e.message : 'Could not save SCORM progress');
    }
  };

  const scheduleFlush = (finalStatus?: string) => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    if (finalStatus) {
      void flush(finalStatus);
      return;
    }
    // ponytail: debounce commits; SCORM packages spam LMSCommit
    flushTimer.current = setTimeout(() => void flush(), 1200);
  };

  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        method: string;
        key?: string;
        value?: string;
        cmi?: Record<string, string>;
      };
      if (data.cmi) cmiRef.current = { ...cmiRef.current, ...data.cmi };
      if (data.method === 'LMSInitialize') setStatus('In progress…');
      if (data.method === 'LMSSetValue' && data.key != null) {
        cmiRef.current[data.key] = data.value ?? '';
        setStatus('In progress…');
      }
      if (data.method === 'LMSCommit') scheduleFlush();
      if (data.method === 'LMSFinish') {
        // use CMI lesson status when present; don't invent "completed"
        void flush(lessonStatusFromCmi(cmiRef.current));
      }
    } catch {
      // ignore non-JSON
    }
  };

  return (
    <View className="flex-1">
      <View className="px-4 py-2 border-b" style={{ borderColor: c.border, backgroundColor: c.card }}>
        <Text className="text-xs" style={{ color: c.muted }}>
          SCORM · {status}
        </Text>
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: launchUrl }}
        injectedJavaScriptBeforeContentLoaded={SCORM_BRIDGE_JS}
        injectedJavaScript={SCORM_BRIDGE_JS}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}
