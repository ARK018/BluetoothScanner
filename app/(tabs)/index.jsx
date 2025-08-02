import React, { useEffect, useState } from "react";
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
import { PERMISSIONS, request, RESULTS } from "react-native-permissions";

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [scanInterval, setScanInterval] = useState(null);

  useEffect(() => {
    // Initialize BLE Manager
    BleManager.start({ showAlert: false });

    // Check if Bluetooth is enabled
    checkBluetoothStatus();

    // Add event listeners
    const handleDiscoverPeripheral = (peripheral) => {
      console.log(
        "🔍 Discovered peripheral:",
        JSON.stringify(peripheral, null, 2)
      );
      setDevices((prevDevices) => {
        // Check if device already exists
        const existingDeviceIndex = prevDevices.findIndex(
          (device) => device.id === peripheral.id
        );
        if (existingDeviceIndex === -1) {
          console.log(
            "➕ Adding new device:",
            peripheral.name || peripheral.id
          );
          return [...prevDevices, peripheral];
        } else {
          // Update existing device with new RSSI and other info
          console.log(
            "🔄 Updating existing device:",
            peripheral.name || peripheral.id
          );
          const updatedDevices = [...prevDevices];
          updatedDevices[existingDeviceIndex] = {
            ...updatedDevices[existingDeviceIndex],
            ...peripheral,
          };
          return updatedDevices;
        }
      });
    };

    const handleStopScan = () => {
      console.log("⏹️ Scan stopped");
      setScanning(false);

      // Clear the polling interval if it exists
      if (scanInterval) {
        clearInterval(scanInterval);
        setScanInterval(null);
      }
    };

    const handleBluetoothStateChange = (args) => {
      console.log("📶 Bluetooth state changed:", args);
      setBluetoothEnabled(args.state === "on");
    };

    const listeners = [
      bleManagerEmitter.addListener(
        "BleManagerDiscoverPeripheral",
        handleDiscoverPeripheral
      ),
      bleManagerEmitter.addListener("BleManagerStopScan", handleStopScan),
      bleManagerEmitter.addListener(
        "BleManagerDidUpdateState",
        handleBluetoothStateChange
      ),
    ];

    return () => {
      listeners.forEach((listener) => listener.remove());
      // Clear any active polling intervals
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [scanInterval]);

  const checkBluetoothStatus = async () => {
    try {
      const enabled = await BleManager.checkState();
      setBluetoothEnabled(enabled === "on");
    } catch (error) {
      console.log("Error checking Bluetooth status:", error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        const permissions =
          Platform.Version >= 31
            ? [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              ]
            : [
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
              ];

        console.log("Requesting permissions:", permissions);
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log("Permission results:", granted);

        const allPermissionsGranted = Object.values(granted).every(
          (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        console.log("All permissions granted:", allPermissionsGranted);
        return allPermissionsGranted;
      } catch (err) {
        console.warn("Permission error:", err);
        return false;
      }
    } else {
      // iOS permissions
      const locationPermission = await request(
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      );
      return locationPermission === RESULTS.GRANTED;
    }
  };

  const startScan = async () => {
    console.log("🚀 Starting scan process...");

    if (!bluetoothEnabled) {
      console.log("❌ Bluetooth not enabled");
      Alert.alert(
        "Bluetooth Disabled",
        "Please enable Bluetooth to scan for devices"
      );
      await checkBluetoothStatus();
      return;
    }

    console.log("✅ Bluetooth enabled, checking permissions...");
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.log("❌ Permissions not granted");
      Alert.alert(
        "Permissions Required",
        "Location permissions are required to scan for Bluetooth devices"
      );
      return;
    }

    console.log("✅ Permissions granted, starting scan...");
    setDevices([]);
    setScanning(true);

    try {
      // Try to get connected peripherals first
      const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
      console.log("🔗 Connected peripherals:", connectedPeripherals);

      // Start scanning for all devices (empty array means scan for all)
      await BleManager.scan([], 10, true); // Scan for 10 seconds, allow duplicates
      console.log("🔍 Scan started successfully");

      // Start polling for discovered devices every 2 seconds while scanning
      const interval = setInterval(async () => {
        try {
          const discoveredPeripherals =
            await BleManager.getDiscoveredPeripherals([]);
          console.log(
            "🔄 Polling discovered devices:",
            discoveredPeripherals.length
          );
          if (discoveredPeripherals.length > 0) {
            setDevices(discoveredPeripherals);
          }
        } catch (error) {
          console.log("💥 Error polling devices:", error);
        }
      }, 2000);

      setScanInterval(interval);

      // Stop polling after 10 seconds (scan duration)
      setTimeout(() => {
        clearInterval(interval);
        setScanInterval(null);
      }, 10000);
    } catch (error) {
      console.log("💥 Error starting scan:", error);
      setScanning(false);
      Alert.alert(
        "Scan Error",
        `Failed to start Bluetooth scan: ${error.message}`
      );
    }
  };

  const stopScan = async () => {
    try {
      await BleManager.stopScan();
      setScanning(false);

      // Clear the polling interval if it exists
      if (scanInterval) {
        clearInterval(scanInterval);
        setScanInterval(null);
      }

      console.log("⏹️ Scan stopped manually");
    } catch (error) {
      console.log("💥 Error stopping scan:", error);
    }
  };

  const refreshDevices = async () => {
    try {
      console.log("🔄 Refreshing discovered devices...");
      const discoveredPeripherals = await BleManager.getDiscoveredPeripherals(
        []
      );
      console.log("📱 Discovered peripherals:", discoveredPeripherals);
      setDevices(discoveredPeripherals);

      // Also get connected peripherals
      const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
      console.log("🔗 Connected peripherals:", connectedPeripherals);

      // Merge unique devices
      const allDevices = [...discoveredPeripherals];
      connectedPeripherals.forEach((connected) => {
        if (!allDevices.find((device) => device.id === connected.id)) {
          allDevices.push({ ...connected, connected: true });
        }
      });

      setDevices(allDevices);
    } catch (error) {
      console.log("💥 Error refreshing devices:", error);
    }
  };

  const connectToDevice = async (deviceId, deviceName) => {
    try {
      await BleManager.connect(deviceId);
      Alert.alert(
        "Connected",
        `Successfully connected to ${deviceName || "Unknown Device"}`
      );

      // Discover services
      setTimeout(async () => {
        try {
          const services = await BleManager.retrieveServices(deviceId);
          console.log("Services:", services);
        } catch (error) {
          console.log("Error retrieving services:", error);
        }
      }, 1000);
    } catch (error) {
      console.log("Connection error:", error);
      Alert.alert("Connection Failed", "Failed to connect to device");
    }
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item.id, item.name)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || "Unknown Device"}</Text>
        <Text style={styles.deviceId}>ID: {item.id}</Text>
        <Text style={styles.deviceRssi}>RSSI: {item.rssi} dBm</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Scanner</Text>
        <Text style={styles.subtitle}>
          Bluetooth: {bluetoothEnabled ? "✅ Enabled" : "❌ Disabled"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, !bluetoothEnabled && styles.buttonDisabled]}
          onPress={scanning ? stopScan : startScan}
          disabled={!bluetoothEnabled}
        >
          <Text style={styles.buttonText}>
            {scanning ? "Stop Scanning" : "Start Scanning"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.refreshButton,
            !bluetoothEnabled && styles.buttonDisabled,
          ]}
          onPress={refreshDevices}
          disabled={!bluetoothEnabled || scanning}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {scanning && (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.scanningText}>Scanning for devices...</Text>
        </View>
      )}

      <View style={styles.devicesContainer}>
        <Text style={styles.devicesTitle}>
          Found Devices ({devices.length})
        </Text>

        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {scanning
                ? "Searching for devices..."
                : 'No devices found. Tap "Start Scanning" to begin.'}
            </Text>
          }
        />
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
  buttonContainer: {
    padding: 20,
    flexDirection: "row",
    gap: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  refreshButton: {
    backgroundColor: "#28a745",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 80,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scanningContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  scanningText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  devicesContainer: {
    flex: 1,
    padding: 20,
  },
  devicesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 15,
  },
  deviceItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 5,
  },
  deviceId: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 3,
  },
  deviceRssi: {
    fontSize: 14,
    color: "#6c757d",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#6c757d",
    marginTop: 50,
  },
});

export default App;
