import React from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Scanner</Text>
        <Text style={styles.subtitle}>Settings & Information</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.sectionText}>
          This app scans for nearby Bluetooth devices and allows you to connect
          to them.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <Text style={styles.sectionText}>
          • Scan for Bluetooth Low Energy (BLE) devices
        </Text>
        <Text style={styles.sectionText}>
          • Display device name, ID, and signal strength
        </Text>
        <Text style={styles.sectionText}>• Connect to discovered devices</Text>
        <Text style={styles.sectionText}>• Real-time device discovery</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <Text style={styles.sectionText}>
          This app requires Bluetooth and Location permissions to scan for
          nearby devices.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Version</Text>
        <Text style={styles.sectionText}>1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: "#495057",
    lineHeight: 24,
    marginBottom: 5,
  },
});
