import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BleManager from "react-native-ble-manager";

// Constants
const SCAN_DURATION = 5; // seconds
const SCAN_INTERVAL = 1000; // 1 second

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// Device Item Component
const DeviceItem = React.memo(({ device, onPress }) => {
  const { name, id, rssi, advertising = {} } = device;
  const displayName = name || "Unknown Device";
  const isConnectable = advertising.isConnectable
    ? "Connectable"
    : "Non-connectable";

  return (
    <TouchableOpacity style={styles.deviceItem} onPress={() => onPress(device)}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{displayName}</Text>
        <Text style={styles.deviceId}>{id}</Text>
      </View>
      <View style={styles.deviceMeta}>
        <Text style={styles.deviceRssi}>{rssi} dBm</Text>
        <Text style={styles.deviceConnectable}>{isConnectable}</Text>
      </View>
    </TouchableOpacity>
  );
});

// Main Component
const App = () => {
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [error, setError] = useState(null);
  const scanIntervalRef = useRef(null);

  // Check and request necessary permissions
  const checkPermissions = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        const allPermissionsGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allPermissionsGranted) {
          throw new Error("Required permissions not granted");
        }
      }
      return true;
    } catch (err) {
      console.error("Permission error:", err);
      setError("Failed to obtain necessary permissions");
      return false;
    }
  }, []);

  // Handle device discovery
  const handleDiscoverPeripheral = useCallback((peripheral) => {
    setDevices((prevDevices) => {
      const deviceExists = prevDevices.some(
        (device) => device.id === peripheral.id
      );
      if (!deviceExists) {
        return [...prevDevices, { ...peripheral, timestamp: Date.now() }];
      }
      // Update existing device with fresh data
      return prevDevices.map((device) =>
        device.id === peripheral.id
          ? { ...peripheral, timestamp: Date.now() }
          : device
      );
    });
  }, []);

  // Start scanning for BLE devices
  const startScan = useCallback(async () => {
    console.log("🚀 Starting scan process...");
    setError(null);

    try {
      // Check and request permissions first
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        console.log("❌ Permissions not granted");
        Alert.alert(
          "Permissions Required",
          "Bluetooth and location permissions are required to scan for devices"
        );
        return;
      }

      // Verify Bluetooth is enabled, and prompt if not
      try {
        await BleManager.enableBluetooth();
      } catch (error) {
        Alert.alert(
          "Bluetooth Required",
          "Please enable Bluetooth to scan for devices."
        );
        return;
      }

      console.log("✅ Starting BLE scan...");
      setDevices([]);
      setIsScanning(true);

      // Clear any existing interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

      // Start scanning
      await BleManager.scan([], SCAN_DURATION, true);
      console.log("🔍 BLE scan started successfully");

      // Set up interval to check for discovered devices
      scanIntervalRef.current = setInterval(async () => {
        try {
          const peripherals = await BleManager.getDiscoveredPeripherals();
          console.log(`🔄 Found ${peripherals.length} devices`);
          if (peripherals.length > 0) {
            setDevices(peripherals);
          }
        } catch (err) {
          console.error("Error getting peripherals:", err);
        }
      }, SCAN_INTERVAL);

      // Stop scanning after duration
      setTimeout(() => {
        console.log("⏱️ Scan duration completed, stopping...");
        stopScan();
      }, SCAN_DURATION * 1000);
    } catch (err) {
      console.error("❌ Scan error:", err);
      setError("Failed to start scanning: " + (err.message || "Unknown error"));
      setIsScanning(false);

      // Ensure we clean up on error
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }
  }, [checkPermissions]);

  // Stop scanning
  const stopScan = useCallback(async () => {
    console.log("🛑 Stopping BLE scan...");

    // Clear the interval first
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    try {
      // Stop the BLE scan
      await BleManager.stopScan();
      console.log("✅ BLE scan stopped successfully");
    } catch (err) {
      console.error("❌ Error stopping BLE scan:", err);
      setError("Error stopping scan: " + (err.message || "Unknown error"));
    } finally {
      // Always ensure we update the scanning state
      setIsScanning(false);
    }
  }, []);

  // Handle device press
  const handleDevicePress = useCallback((device) => {
    Alert.alert(
      "Device Selected",
      `Name: ${device.name || "N/A"}\nID: ${device.id}\nRSSI: ${
        device.rssi
      } dBm`,
      [{ text: "OK" }]
    );
  }, []);

  // Set up event listeners
  useEffect(() => {
    BleManager.start({ showAlert: false });

    const handleBluetoothStateChange = (state) => {
      const isEnabled = state === "on" || state === "On" || state === "ON";
      setBluetoothEnabled(isEnabled);
    };

    const listeners = [
      bleManagerEmitter.addListener(
        "BleManagerDiscoverPeripheral",
        handleDiscoverPeripheral
      ),
      bleManagerEmitter.addListener("BleManagerStopScan", stopScan),
      bleManagerEmitter.addListener(
        "BleManagerDidUpdateState",
        handleBluetoothStateChange
      ),
    ];

    // Check initial Bluetooth state
    const checkInitialBluetoothState = async () => {
      try {
        const state = await BleManager.checkState();
        handleBluetoothStateChange(state);
      } catch (error) {
        console.error("Error checking initial Bluetooth state:", error);
        setBluetoothEnabled(false);
      }
    };

    checkInitialBluetoothState();

    return () => {
      listeners.forEach((listener) => listener.remove());
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [handleDiscoverPeripheral, stopScan]);

  // Render device list item
  const renderDeviceItem = useCallback(
    ({ item }) => <DeviceItem device={item} onPress={handleDevicePress} />,
    [handleDevicePress]
  );

  // Render empty state
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {isScanning
          ? "Scanning for devices..."
          : "No devices found. Tap Scan to start."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Scanner</Text>
        <Text style={styles.subtitle}>
          {bluetoothEnabled ? "Bluetooth is enabled" : "Bluetooth is disabled"}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.deviceList}>
        <FlatList
          data={devices}
          renderItem={renderDeviceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonDisabled]}
          onPress={isScanning ? stopScan : startScan}
          disabled={isScanning} // Allow pressing even if Bluetooth is off
          activeOpacity={0.7}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {devices.length > 0 ? "Scan Again" : "Start Scan"}
            </Text>
          )}
        </TouchableOpacity>

        {devices.length > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={() => setDevices([])}
            disabled={isScanning}
          >
            <Text style={[styles.buttonText, styles.clearButtonText]}>
              Clear List
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 12,
    margin: 10,
    borderRadius: 6,
  },
  errorText: {
    color: "#c62828",
    textAlign: "center",
  },
  deviceList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deviceInfo: {
    flex: 1,
    marginRight: 10,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  deviceMeta: {
    alignItems: "flex-end",
  },
  deviceRssi: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2196f3",
    marginBottom: 4,
  },
  deviceConnectable: {
    fontSize: 12,
    color: "#4caf50",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#2196f3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: "#90caf9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  clearButtonText: {
    color: "#666",
  },
});

export default App;
