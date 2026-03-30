import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

export function useDeviceLocation(autoRequest = false) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPosition = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionGranted(false);
        setError("Location permission denied.");
        return;
      }

      setPermissionGranted(true);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
      setAccuracy(current.coords.accuracy ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get location.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRequest) return;
    void requestPosition();
  }, [autoRequest, requestPosition]);

  return {
    latitude,
    longitude,
    accuracy,
    error,
    loading,
    permissionGranted,
    hasLocation: latitude !== null && longitude !== null,
    requestPosition,
  };
}
