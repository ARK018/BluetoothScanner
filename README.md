# Bluetooth Scanner App 📱

This is a React Native [Expo](https://expo.dev) project that implements a Bluetooth Low Energy (BLE) scanner for detecting and displaying nearby Bluetooth devices.

## Overview

The app provides a comprehensive Bluetooth scanning interface that discovers nearby BLE devices and displays detailed information about their advertisement data. It's specifically configured to scan for a target device (ZT02) but can be easily modified to scan for all devices.

## Features

- 🔍 **BLE Device Scanning**: Automatically discovers nearby Bluetooth Low Energy devices
- 📊 **Device Information Display**: Shows device name, MAC address, RSSI signal strength, and advertisement data
- 🎯 **Targeted Scanning**: Currently configured to scan for specific device (ZT02)
- 📋 **Advertisement Data Analysis**: Displays service UUIDs, manufacturer data, TX power, and connectivity status
- 📱 **Cross-Platform**: Works on both Android and iOS
- 🔐 **Permission Management**: Handles Bluetooth and location permissions automatically

## Architecture

### Main Component Structure

The app is built around a single main component (`App`) with the following key parts:

#### State Management

- `devices`: Array of discovered BLE devices
- `isScanning`: Boolean indicating if scanning is active
- `bluetoothEnabled`: Bluetooth adapter status
- `error`: Error state for user feedback

#### Key Functions

**`startScan()`**

- Requests necessary permissions (Bluetooth, location)
- Enables Bluetooth if disabled
- Initiates BLE scanning for specified duration (10 seconds)
- Sets up interval polling to check for discovered devices
- Filters results for target device (ZT02 with MAC: E5:83:27:D1:D2:94)

**`stopScan()`**

- Cleanly stops the BLE scanning process
- Clears polling intervals
- Updates UI state

**`handleDevicePress()`**

- Displays detailed device information in an alert
- Shows raw advertisement data for debugging
- Provides option to copy data to clipboard

#### Device Information Display

Each discovered device shows:

- **Device Name**: Bluetooth advertised name or "Unknown Device"
- **MAC Address**: Unique device identifier
- **RSSI**: Signal strength in dBm
- **TX Power**: Transmission power level (if available)
- **Connectivity**: Whether device accepts connections
- **Service UUIDs**: Advertised Bluetooth services
- **Manufacturer Data**: Device-specific information

### Components

**`DeviceItem`** - Memoized component for efficient list rendering

- Displays device information in a clean card layout
- Shows advertisement data preview
- Handles device selection

### Permissions

The app requests these Android permissions:

- `ACCESS_FINE_LOCATION`: Required for BLE scanning
- `BLUETOOTH_SCAN`: Required for discovering devices
- `BLUETOOTH_CONNECT`: Required for device connections

### Event Listeners

- `BleManagerDiscoverPeripheral`: Handles new device discoveries
- `BleManagerStopScan`: Manages scan completion
- `BleManagerDidUpdateState`: Monitors Bluetooth adapter state

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Install the BLE Manager package

   ```bash
   npm install react-native-ble-manager
   ```

3. For iOS, install pods (if using bare React Native):

   ```bash
   cd ios && pod install
   ```

4. Start the app

   ```bash
   npx expo start
   ```

## Usage

1. **Enable Bluetooth**: Ensure Bluetooth is enabled on your device
2. **Grant Permissions**: Allow location and Bluetooth permissions when prompted
3. **Start Scanning**: Tap "Start Scan" to begin discovering devices
4. **View Details**: Tap any discovered device to see detailed advertisement data
5. **Copy Data**: Use the "Copy to Clipboard" option to save device information

## Configuration

### Target Device Settings

To modify the target device, update the filter in `startScan()`:

```javascript
const targetDevice = peripherals.find(
  (device) =>
    device.name === "YOUR_DEVICE_NAME" ||
    device.id === "YOUR_DEVICE_MAC_ADDRESS"
);
```

### Scan Parameters

Adjust scanning behavior by modifying these constants:

```javascript
const SCAN_DURATION = 10; // Scan time in seconds
const SCAN_INTERVAL = 1000; // Device check interval in milliseconds
```

### Universal Scanning

To scan for all devices instead of a specific target, replace the filtered approach with:

```javascript
// In the interval callback
setDevices(peripherals);
```

## Platform Support

- **Android**: Full support with runtime permissions
- **iOS**: Full support with Info.plist permissions
- **Web**: Limited BLE support (depends on browser)

## Troubleshooting

**No devices found:**

- Ensure Bluetooth is enabled
- Check location permissions are granted
- Verify target device is advertising and nearby

**Permission errors:**

- Manually enable location services in device settings
- Restart the app after granting permissions

**Scanning stops immediately:**

- Check for multiple scan instances
- Ensure proper cleanup of previous scans

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [React Native BLE Manager](https://github.com/innoveit/react-native-ble-manager): BLE library documentation
- [Bluetooth Low Energy Guide](https://docs.expo.dev/versions/latest/sdk/bluetooth/): Expo BLE implementation guide

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
