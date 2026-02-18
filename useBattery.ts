import { useState, useEffect } from 'react';

export interface BatteryState {
  level: number; // 0.0 to 1.0
  charging: boolean;
  supported: boolean;
}

// Extend Navigator interface for getBattery
interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery: () => Promise<BatteryManager>;
}

export const useBattery = () => {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    level: 1,
    charging: true,
    supported: false,
  });

  useEffect(() => {
    const nav = navigator as unknown as NavigatorWithBattery;
    if (!nav.getBattery) {
      setBatteryState(s => ({ ...s, supported: false }));
      return;
    }

    let batteryManager: BatteryManager | null = null;

    const updateBattery = () => {
      if (batteryManager) {
        setBatteryState({
          level: batteryManager.level,
          charging: batteryManager.charging,
          supported: true,
        });
      }
    };

    nav.getBattery().then((battery) => {
      batteryManager = battery;
      updateBattery();
      
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    }).catch(() => {
        setBatteryState(s => ({ ...s, supported: false }));
    });

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBattery);
        batteryManager.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  return batteryState;
};
