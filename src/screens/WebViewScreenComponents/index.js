import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import styles from '../../styles';
import { forwardRef } from 'react';

const WebViewComponent = forwardRef((props, ref) => {
  const { url, setLoading, loading, navStateFunction, zoom, panResponder, currscale } = props;

  return (
    <View style={styles.webviewContainer}>
      <WebView ref={ref}
        onNavigationStateChange={navStateFunction}
        source={{ uri: url }}
        onLoad={() => setLoading(false)}
        scalesPageToFit={false}
        javaScriptEnabled={true}
        bounces={false}
        startInLoadingState={true}
        originWhitelist={['*']}
        style={{ transform: [{ scale: currscale }] }}
        {...(zoom ? panResponder.panHandlers : {})}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="blue" />
        </View>
      )}
    </View>
  );
});

export default WebViewComponent;
