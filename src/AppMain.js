/* @flow */
("use strict");

import React from "react";
import { ThemeContext, themes } from "./ThemeContext";
import {
  Alert,
  Appearance,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  NativeModules,
  NativeEventEmitter,
  Settings,
  StatusBar,
  StyleSheet,
  ToastAndroid,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createStackNavigator,
  TransitionPresets,
} from "@react-navigation/stack";
//import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PushNotificationIOS from "@react-native-community/push-notification-ios";
import Screens from "./screens";
import Site from "./site";
import SiteManager from "./site_manager";
import SafariView from "react-native-safari-view";
import SafariWebAuth from "react-native-safari-web-auth";
import DeviceInfo from "react-native-device-info";
//import firebaseMessaging from "./platforms/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
//import RootViewBackgroundColor from "react-native-root-view-background-color";
//import { CustomTabs } from "react-native-custom-tabs";
import * as RNLocalize from "react-native-localize";
import { findBestLanguageTag } from "react-native-localize";
import { addShortcutListener } from "react-native-siri-shortcut";
import { enableScreens } from "react-native-screens";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "@react-native-community/blur";
import  I18n from "i18n-js";
import _ from "lodash";

import BackgroundFetch from "./platforms/background-fetch";

import DiscourseWebScreen from "./screens/DiscourseWebScreen";
import translations  from "./shared";
import { HOME_URL } from "./constants";

const { DiscourseKeyboardShortcuts } = NativeModules;



// 로케일 설정
const setI18nConfig = (translations) => {
  const locales = RNLocalize.getLocales();

  if (Array.isArray(locales)) {
    I18n.locale = locales[0].languageTag;
  }

  I18n.fallbacks = true; // 기본값 설정
  I18n.translations = translations;
  return I18n
};

i18n=setI18nConfig(translations);

enableScreens();

// TODO: Use NativeStackNavigator instead?
const Stack = createStackNavigator();
//const Tab = createBottomTabNavigator();

//const Site_HOME = await Site.fromURL(HOME_URL);

class AppMain extends React.Component {
  refreshTimerId = null;

  constructor(props) {
    super(props);
    this._siteManager = new SiteManager();
    this._refresh = this._refresh.bind(this);
    this._initBackgroundFetch = this._initBackgroundFetch.bind(this);

    this._handleAppStateChange = (nextAppState) => {
      console.log("Detected appState change: " + nextAppState);

      if (nextAppState.match(/inactive|background/)) {
        this._seenNotificationMap = null;
        clearTimeout(this.refreshTimerId);
      } else {
        StatusBar.setHidden(false);
        this._siteManager.refreshSites();

        clearTimeout(this.refreshTimerId);
        this.refreshTimerId = setTimeout(this._refresh, 30000);
      }
    };

    this._handleOpenUrl = this._handleOpenUrl.bind(this);

    if (Platform.OS === "ios") {
      PushNotificationIOS.addEventListener("notification", (e) =>
        this._handleNotification(e)
      );

      // local notifications, triggered via background fetch
      // for non-hosted sites only (sites where hasPush = false)
      PushNotificationIOS.addEventListener("localNotification", (e) =>
        this._handleNotification(e)
      );

      PushNotificationIOS.addEventListener("register", (s) => {
        this._siteManager.registerClientId(s);
      });

      PushNotificationIOS.getInitialNotification().then((e) => {
        if (e) {
          this._handleNotification(e);
        }
      });
    }

    const colorScheme = Appearance.getColorScheme();
    const largerUI =
      DeviceInfo.getDeviceType() === "Tablet" ||
      DeviceInfo.getDeviceType() === "Desktop";

    this.state = {
      hasNotch: DeviceInfo.hasNotch(),
      deviceId: DeviceInfo.getDeviceId(),
      largerUI: largerUI,
      theme: colorScheme === "dark" ? themes.dark : themes.light,
      url: HOME_URL,
    };

    this.setRootBackground(colorScheme);

    this.subscription = Appearance.addChangeListener(() => {
      const newColorScheme = Appearance.getColorScheme();
      this.setRootBackground(newColorScheme);
      this.setState({
        theme: newColorScheme === "dark" ? themes.dark : themes.light,
      });
    });

    // Toggle dark mode for older Androids (using a custom button in DebugRow)
    if (Platform.OS === "android" && Platform.Version < 29) {
      AsyncStorage.getItem("@Discourse.androidLegacyTheme").then(
        (storedTheme) => {
          this.setState({
            theme:
              storedTheme && storedTheme === "dark"
                ? themes.dark
                : themes.light,
          });
        }
      );
    }

    console.log('listSites', this._siteManager.listSites());

    // centromics 사이트 추가되지 않았으면 추가 
    //const Site_HOME = Site.fromURL(HOME_URL);
    if(!this._siteManager.urlInSites(HOME_URL)) {
      this._addSite(HOME_URL);
    }
  }

  setRootBackground(colorScheme) {
    if (Platform.OS === "android") {
      return;
    }

    // if (colorScheme === "dark") {
    //   RootViewBackgroundColor.setBackground(0, 0, 0, 1);
    // } else {
    //   RootViewBackgroundColor.setBackground(255, 255, 255, 1);
    // }
  }

  _handleNotification(e) {
    console.log("got notification", e);
    const url = e._data && e._data.discourse_url;

    if (url) {
      this._siteManager.setActiveSite(url).then((activeSite) => {
        let supportsDelegatedAuth = false;
        if (this._siteManager.supportsDelegatedAuth(activeSite)) {
          supportsDelegatedAuth = true;
        }
        this.openUrl(url, supportsDelegatedAuth);
      });
    }
  }

  _handleOpenUrl(event) {
    console.log("_handleOpenUrl", event);

    if (event.url.startsWith("discourse://")) {
      let params = this.parseURLparameters(event.url);
      let site = this._siteManager.activeSite;

      if (Platform.OS === "ios" && Settings.get("external_links_svc")) {
        SafariView.dismiss();
      }

      // initial auth payload
      if (params.payload) {
        this._siteManager.handleAuthPayload(params.payload);
      }

      // received one-time-password request from SafariView
      if (params.otp) {
        this._siteManager
          .generateURLParams(site, "full")
          .then((generatedParams) => {
            SafariWebAuth.requestAuth(
              `${site.url}/user-api-key/otp?${generatedParams}`
            );
          });
      }

      // one-time-password received, launch site with it
      if (params.oneTimePassword) {
        const OTP = this._siteManager.decryptHelper(params.oneTimePassword);
        this.openUrl(`${site.url}/session/otp/${OTP}`);
      }

      // handle site URL passed via app-argument
      if (params.siteUrl) {
        if (this._siteManager.exists({ url: params.siteUrl })) {
          console.log(`${params.siteUrl} exists!`);
          this.openUrl(params.siteUrl);
        } else {
          console.log(`${params.siteUrl} does not exist, attempt adding`);
          this._addSite(params.siteUrl);
        }
      }

      // handle shared URLs
      if (params.sharedUrl) {
        this._siteManager.setActiveSite(params.sharedUrl).then((activeSite) => {
          if (activeSite.activeSite !== undefined) {
            let supportsDelegatedAuth = false;
            if (this._siteManager.supportsDelegatedAuth(activeSite)) {
              supportsDelegatedAuth = true;
            }
            this.openUrl(params.sharedUrl, supportsDelegatedAuth);
          } else {
            this._addSite(params.sharedUrl);
          }
        });
      }
    }
  }

  componentDidMount() {
    console.log('Platform.OS', Platform.OS);

    this._appStateSubscription = AppState.addEventListener(
      "change",
      this._handleAppStateChange
    );

    this._handleOpenUrlSubscription = Linking.addEventListener(
      "url",
      this._handleOpenUrl
    );

    Linking.getInitialURL().then((url) => {
      if (url) {
        this._handleOpenUrl({ url: url });
      }
    });

    if (Platform.OS === "ios") {
      PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });

      addShortcutListener(({ userInfo, activityType }) => {
        if (userInfo.siteUrl) {
          this._handleOpenUrl({
            url: `discourse://share?sharedUrl=${userInfo.siteUrl}`,
          });
        }
      });

      // this.eventEmitter = new NativeEventEmitter(DiscourseKeyboardShortcuts);
      // this.eventEmitter.addListener("keyInputEvent", (res) => {
      //   const { input } = res;

      //   if (input === "W") {
      //     //this._navigation.navigate("Home");
      //   } else {
      //     const index = parseInt(input, 10) - 1;
      //     const site = this._siteManager.getSiteByIndex(index);

      //     if (site) {
      //       this.openUrl(site.url);
      //     }
      //   }
      // });

      // delay here may be redundant, but it ensures site data is loaded
      //setTimeout(this._initBackgroundFetch, 2000);
    }

    clearTimeout(this.refreshTimerId);
    this.refreshTimerId = setTimeout(this._refresh, 30000);
  }

  // runs on background, ever 15 mins max
  // updates site unread counts, app badge
  // and for non-hosted sites, triggers a local notification if new count > old count
  async _initBackgroundFetch() {
    // uncomment to test iOS background
    // this will run on app live reload
    // await this._siteManager.iOSbackgroundRefresh();

    const onEvent = async (taskId) => {
      console.log("[BackgroundFetch] task: ", taskId);
      await this._siteManager.iOSbackgroundRefresh();

      // You must signal to the OS that your task is complete.
      BackgroundFetch.finish(taskId);
    };

    // Timeout callback is executed when your Task has exceeded its allowed running-time.
    // You must stop what you're doing immediately BackgroundFetch.finish(taskId)
    const onTimeout = async (taskId) => {
      console.warn("[BackgroundFetch] TIMEOUT task: ", taskId);
      BackgroundFetch.finish(taskId);
    };
    // Initialize BackgroundFetch only once when component mounts.
    let status = await BackgroundFetch.configure(
      { minimumFetchInterval: 15 },
      onEvent,
      onTimeout
    );
    console.log("[BackgroundFetch] configure status: ", status);
  }

  async _refresh() {
    clearTimeout(this.refreshTimerId);
    await this._siteManager.refreshSites();
    this.refreshTimerId = setTimeout(this._refresh, 30000);
  }

  async _addSite(url) {
    console.log('_addSite', url);

    // when adding a site, try stripping off the path
    // helps find the site if users aren't on homepage
    const match = url.match(/^(https?:\/\/[^/]+)\//);

    console.log('_addSite match', match);

    if (!match) {
      Alert.alert(i18n.t("cannot_load_url"));
    }

    const siteUrl = match[1];

    try {
      const newSite = await Site.fromTerm(siteUrl);

      if (newSite) {
        this._siteManager.add(newSite);
        //this._navigation.navigate("Home");
      }
    } catch (error) {
      if (url !== siteUrl) {
        // stripping off path is imperfect, try the full URL
        // this is particularly helpful with subfolder sites
        try {
          const newSite2 = await Site.fromTerm(url);
          if (newSite2) {
            this._siteManager.add(newSite2);
            //this._navigation.navigate("Home");
          }
        } catch (e) {
          console.log("Error adding site: ", e);
          Alert.alert(i18n.t("cannot_load_url"));
        }
      } else {
        console.log("Error adding site: ", error);
        Alert.alert(i18n.t("cannot_load_url"));
      }
    }
  }

  componentWillUnmount() {
    this.eventEmitter?.removeAllListeners("keyInputEvent");
    this._appStateSubscription?.remove();
    this._handleOpenUrlSubscription?.remove();
    this.subscription?.remove();
    clearTimeout(this.safariViewTimeout);
    clearTimeout(this.refreshTimerId);
  }

  parseURLparameters(string) {
    let parsed = {};
    (string.split("?")[1] || string)
      .split("&")
      .map((item) => {
        return item.split("=");
      })
      .forEach((item) => {
        parsed[item[0]] = decodeURIComponent(item[1]);
      });
    return parsed;
  }

  openUrl(url, supportsDelegatedAuth = true) {
    console.log('openUrl', url);
    
    if (Platform.OS === "ios") {
      if (!supportsDelegatedAuth) {
        this.safariViewTimeout = setTimeout(
          () => SafariView.show({ url }),
          400
        );
      } else {
        SafariView.dismiss();

        console.log('openUrl: naviate: url1: ', url)
        //this._navigation.navigate("WebView", {
        this._navigation.navigate("Home", {
          url: url,
        });
      }
    }

    if (Platform.OS === "android") {
      //AsyncStorage.getItem("@Discourse.androidCustomTabs").then((value) => {
        // if (value) {
        //   CustomTabs.openURL(url, {
        //     enableUrlBarHiding: true,
        //     showPageTitle: false,
        //   }).catch((err) => {
        //     console.error(err);
        //   });
        // } else {
        //   Linking.openURL(url);
        // }
      //});
      // console.log('openUrl: naviate: url2: ', url)
      // this._navigation.navigate("Home", {
      //   url: url,
      // });
      this.setState({ url: url });      
    }
  }

  _toggleTheme(newTheme) {
    this.setState({
      theme: newTheme === "dark" ? themes.dark : themes.light,
    });
  }

  _blurView(themeName) {
    const positionStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    };
    if (Platform.OS !== "ios") {
      return (
        <View
          style={{
            ...positionStyle,
            backgroundColor: this.state.theme.background,
          }}
        />
      );
    }

    return (
      <BlurView blurType={themeName} blurAmount={15} style={positionStyle} />
    );
  }

  visitSite(site, connect = false, endpoint = '') {
    
    this._siteManager.setActiveSite(site);
    console.log('visitSite', site)
    if (site.authToken) {
      if (site.oneTimePassword) {
        //this.props.screenProps.
        this.openUrl(
          `${site.url}/session/otp/${site.oneTimePassword}`,
        );
      } else {
        if (this._siteManager.supportsDelegatedAuth(site)) {
          this._siteManager.generateURLParams(site).then(params => {
            //this.props.screenProps.
            this.openUrl(`${site.url}${endpoint}?${params}`);
          });
        } else {
          //this.donateShortcut(site);
          //this.props.screenProps.
          this.openUrl(
            `${site.url}${endpoint}?discourse_app=1`,
            false,
          );
        }
      }
      return;
    }

    if (connect || site.loginRequired) {
      this._siteManager.generateAuthURL(site).then(url => {
        console.log('visitsite: generateurl: ', url);
        if (this._siteManager.supportsDelegatedAuth(site)) {
          SafariWebAuth.requestAuth(url);
        } else {
          //this.props.screenProps.
          this.openUrl(url, false);
        }
      });
    } else {      
      //this.donateShortcut(site);
      //this.props.screenProps.
      this.openUrl(`${site.url}`);
    }
  }

  render() {
    // TODO: pass only relevant props to each screen component
    const screenProps = {
      openUrl: this.openUrl.bind(this),
      _handleOpenUrl: this._handleOpenUrl,
      seenNotificationMap: this._seenNotificationMap,
      setSeenNotificationMap: (map) => {
        this._seenNotificationMap = map;
      },
      siteManager: this._siteManager,
      hasNotch: this.state.hasNotch,
      deviceId: this.state.deviceId,
      largerUI: this.state.largerUI,
      toggleTheme: this._toggleTheme.bind(this),
      url: this.state.url,
      onClickConnect: () => {
        let item = _.first(this._siteManager.listSites());
        if(item)
          this.visitSite(item, true)
        else 
          console.log('no site registered');
      },
    };

    const theme = this.state.theme;

    return (
      <NavigationContainer>
        <ThemeContext.Provider value={this.state.theme}>
          <StatusBar barStyle={this.state.theme.barStyle} />
          <Stack.Navigator
            initialRouteName="Home"
            presentation="modal"
            screenOptions={({ navigation }) => {
              console.log('_navigation', this._navigation);
              this._navigation = navigation;
              return {
                headerShown: false,
                ...TransitionPresets.ModalSlideFromBottomIOS,
              };
            }}
          >
            <Stack.Screen name="Home">
              {(props) => (
                <DiscourseWebScreen
                  {...props}
                  screenProps={{ ...screenProps }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Notifications"
              options={{
                headerShown: true,
              }}
            >
              {(props) => (
                <Screens.Notifications
                  {...props}
                  screenProps={{ ...screenProps }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name={i18n.t("settings")}
              options={{
                headerShown: true,
              }}
            >
              {(props) => (
                <Screens.Settings {...props} screenProps={{ ...screenProps }} />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </ThemeContext.Provider>
      </NavigationContainer>
    );
  }
}

export default AppMain;
