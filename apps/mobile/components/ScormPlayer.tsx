import { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { saveScormProgress } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface ScormPlayerProps {
  baseUrl: string;
  entryPoint: string;
  enrollmentId: string;
  moduleId?: string;
}

const SCORM_BRIDGE_JS = `
(function() {
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

export function ScormPlayer({ baseUrl, entryPoint, enrollmentId, moduleId }: ScormPlayerProps) {
  const { c } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState('Launching…');
  const cmiRef = useRef<Record<string, string>>({});
  const launchUrl = `${baseUrl}/${entryPoint}`.replace(/([^:]\/)\/+/g, '$1');

  const flush = async (finalStatus?: string) => {
    const cmi = cmiRef.current;
    const scoreRaw =
      cmi['cmi.core.score.raw'] || cmi['cmi.score.raw'] || cmi['cmi.core.score.raw'];
    const lesson =
      finalStatus ||
      cmi['cmi.core.lesson_status'] ||
      cmi['cmi.completion_status'] ||
      cmi['cmi.success_status'] ||
      'incomplete';
    const score = scoreRaw != null && scoreRaw !== '' ? Number(scoreRaw) : undefined;
    try {
      await saveScormProgress({
        enrollmentId,
        score: Number.isFinite(score) ? score : undefined,
        status: lesson,
        cmiData: cmi,
        moduleId: moduleId?.startsWith('scorm-') ? undefined : moduleId,
      });
      setStatus(`Saved · ${lesson}${score != null ? ` · ${score}%` : ''}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not save SCORM progress');
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        method: string;
        key?: string;
        value?: string;
        cmi?: Record<string, string>;
      };
      if (data.cmi) cmiRef.current = { ...cmiRef.current, ...data.cmi };
      if (data.method === 'LMSSetValue' && data.key != null) {
        cmiRef.current[data.key] = data.value ?? '';
        setStatus('In progress…');
      }
      if (data.method === 'LMSCommit') {
        void flush();
      }
      if (data.method === 'LMSFinish') {
        void flush('completed');
      }
    } catch {
      // ignore
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
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        style={{ flex: 1 }}
      />
    </View>
  );
}
