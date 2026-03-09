import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const useDEXAgent = () => {
  const collectDEXData = async () => {
    // 1. Hardware Fingerprinting
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    // 2. Network Metadata
    const nav = window.navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    // 3. Sensor Data (Check for Emulator)
    let isEmulator = false;
    // Emulators often have 0 or static sensor readings
    const sensorData = { accelerometer: false };
    if (window.DeviceMotionEvent) {
      sensorData.accelerometer = true;
    }

    return {
      fingerprint: result.visitorId,
      components: result.components, // Detailed profile (JSON)
      network: {
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        effectiveType: connection?.effectiveType,
        language: nav.language,
        platform: nav.platform,
      },
      isEmulatorFlag: !sensorData.accelerometer, 
      timestamp: new Date().toISOString()
    };
  };

  return { collectDEXData };
};