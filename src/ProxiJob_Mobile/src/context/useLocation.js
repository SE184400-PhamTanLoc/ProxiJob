import { useState, useCallback } from 'react';

const STUDENT_MOCK_GPS = {
  latitude: 10.7769,
  longitude: 106.7009
};

export const useLocation = () => {
  const [studentCoords, setStudentCoords] = useState(STUDENT_MOCK_GPS);
  const [simulatedDistanceToActive, setSimulatedDistanceToActive] = useState(3200);

  const getDistanceInMeters = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  }, []);

  return {
    STUDENT_MOCK_GPS,
    studentCoords,
    setStudentCoords,
    simulatedDistanceToActive,
    setSimulatedDistanceToActive,
    getDistanceInMeters
  };
};
