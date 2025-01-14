// It's not ideal that we have to manually register languages here
// but react-native doesn't make it easy to loop through files in a folder
// there's react-native-fs, but I hesitate to add another dependency just for that
const translations = {
  ar: require("./locale/ar.json"),
  de: require("./locale/de.json"),
  en: require("./locale/en.json"),
  es: require("./locale/es.json"),
  fi: require("./locale/fi.json"),
  fr: require("./locale/fr.json"),
  he: require("./locale/he.json"),
  hu: require("./locale/hu.json"),
  it: require("./locale/it.json"),
  ja: require("./locale/ja.json"),
  ko: require("./locale/ko.json"),
  nl: require("./locale/nl.json"),
  pl: require("./locale/pl_PL.json"),
  "pt-BR": require("./locale/pt_BR.json"),
  ru: require("./locale/ru.json"),
  sv: require("./locale/sv.json"),
  tr: require("./locale/tr_TR.json"),
  "zh-CN": require("./locale/zh_CN.json"),
  "zh-TW": require("./locale/zh_TW.json"),
};


export default translations;
