import React, { useState, useRef, useContext, useEffect } from "react";
import {
  View,
  Text,
  //TextInput,
  TouchableOpacity,
  // ActivityIndicator,
  // Modal,
  // Alert,
  TouchableHighlight,
  Share,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { PanResponder } from "react-native";
import WebViewComponent from "./WebViewScreenComponents";
import styles from "../styles";
import { HOME_URL } from "../constants";
import {ThemeContext} from '../ThemeContext';

const DiscourseWebScreen = (props) => {
  const { navigation, screenProps } = props;
  const [url, setUrl] = useState(HOME_URL);
  const [prev, setPrev] = useState(false);
  const [next, setNext] = useState(false);
  const webviewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currscale, setCurrScale] = useState(1);
  const [zoom, setZoom] = useState(false);
  const theme = useContext(ThemeContext);

  // 부모로부터 새로운 URL이 전달될 때마다 업데이트
  useEffect(() => {
    setUrl(screenProps.url);
  }, [screenProps.url]);

  const isHome = () => {
    return webviewRef.current.url == HOME_URL;
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.numberActiveTouches === 2;
    },
    onPanResponderGrant: () => {
      setZoom(true);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.numberActiveTouches === 2) {
        const distance = Math.sqrt(
          Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
        );
        const newScale = (currscale + (distance - 20) / 1000).toFixed(2);
        if (newScale >= 1) {
          setCurrScale(newScale);
        }
      }
    },
    zoomFunction: () => {
      setZoom(false);
    },
  });

  const navStateFunction = (navState) => {
    setPrev(navState.canGoBack);
    setNext(navState.canGoForward);
  };

  const prevFunction = () => {
    if (prev) {
      webviewRef.current.goBack();
    }
  };

  const nextFunction = () => {
    if (next) {
      webviewRef.current.goForward();
    }
  };

  const homeFunction = () => {
    if (!isHome()) {
      setUrl(HOME_URL);
    }
  };

  const reloadFunction = () => {
    webviewRef.current.reload();
  };

  const stopFunction = () => {
    webviewRef.current.stopLoading();
  };

  const shareFunction = async () => {
    try {
      const result = await Share.share({
        message: "I want to share Centromics app links.",
        url: HOME_URL,
        title: "Centromics",
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // iOS에서 공유 유형이 있습니다.
          console.log("Shared with activity type: ", result.activityType);
        } else {
          // 공유 성공
          console.log("Share was successful");
        }
      } else if (result.action === Share.dismissedAction) {
        // 공유 취소
        console.log("Share was dismissed");
      }
    } catch (error) {
      console.error("Error sharing content:", error.message);
    }
  };

  const notificationFunction = () => {
    console.log("notificationFunction");
    navigation.navigate("Notifications");
  };

  const increaseFontSize = () => {
    webviewRef.current.injectJavaScript(`
    var style = document.body.style;
    style.fontSize = (parseFloat(style.fontSize) || 16) + 2 + 'px';
    `);
  };

  const decreaseFontSize = () => {
    webviewRef.current.injectJavaScript(`
    var style = document.body.style;
    style.fontSize = (parseFloat(style.fontSize) || 16) - 2 + 'px';
    `);
  };

  const webviewProps = {
    url,
    prev,
    next,
    loading,
    setLoading,
    navStateFunction,
    reloadFunction,
    stopFunction,
    increaseFontSize,
    decreaseFontSize,
    shareFunction,
    zoom,
    panResponder,
    currscale,
  };

  return (
    <View style={styles.container}>
      <WebViewComponent {...webviewProps} ref={webviewRef} />

      {/* 연결버튼 */}
      <TouchableHighlight
        style={styles.notifications}
        underlayColor={theme.background}
        onPress={() => screenProps.onClickConnect()}>
        <Text
          style={{
            ...styles.connect,
            backgroundColor: theme.blueCallToAction,
            color: theme.buttonTextColor,
          }}>
          {i18n.t('connect')}
        </Text>
      </TouchableHighlight>

      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={prevFunction}
          disabled={!prev}
          style={styles.iconButton}
        >
          <Icon
            name="chevron-left"
            size={18}
            color={prev ? "black" : "lightgray"}
          />
          <Text style={styles.iconText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={nextFunction}
          disabled={!next}
          style={styles.iconButton}
        >
          <Icon
            name="chevron-right"
            size={18}
            color={next ? "black" : "lightgray"}
          />
          <Text style={styles.iconText}>Forward</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={homeFunction} style={styles.iconButton}>
          <Icon name="home" size={18} color="black" />
          <Text style={styles.iconText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={reloadFunction} style={styles.iconButton}>
          <Icon name="refresh" size={18} color="black" />
          <Text style={styles.iconText}>Reload</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={shareFunction} style={styles.iconButton}>
          <Icon name="share-alt" size={18} color="black" />
          <Text style={styles.iconText}>Share</Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          onPress={notificationFunction}
          style={styles.iconButton}
        >
          <Icon name="bell" size={18} color="black" />
          <Text style={styles.iconText}>Notifiication</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={reloadFunction} style={styles.iconButton}>
          <Icon name="gear" size={18} color="black" />
          <Text style={styles.iconText}>Setting</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DiscourseWebScreen;
