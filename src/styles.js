import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 0,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 1,
    paddingLeft: 15,
    paddingRight: 15,
  },
  iconButton: {
    backgroundColor: "transparent",
    padding: 5,
    paddingTop: 10,
    paddingBottom: 5,
    borderRadius: 5,
    alignItems: "center",
  },
  iconText: {
    color: "black",
    textAlign: "center",
    fontSize: 10,
    paddingTop: 4,
    color: "gray",
  },
  webviewContainer: {
    flex: 1,
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
});

export default styles;
