import React, { useCallback, useEffect, useRef, useState } from "react";
import { hashCloudSeed } from "./cloudSeed";
import { playThunderSound } from "../audio/stormAudio";
import "./stormWeather.css";

const MIN_LIGHTNING_MS = 7000;
const MAX_LIGHTNING_MS = 16000;

function nextLightningDelayMs(seed: number): number {
  const span = MAX_LIGHTNING_MS - MIN_LIGHTNING_MS;
  return MIN_LIGHTNING_MS + (seed % span);
}

export interface StormWeatherProps {
  scenarioId: string;
  reducedMotion?: boolean;
}

export function StormWeather({ scenarioId, reducedMotion = false }: StormWeatherProps) {
  const [flashActive, setFlashActive] = useState(false);
  const [boltX, setBoltX] = useState("50%");
  const tickRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const triggerLightning = useCallback(() => {
    tickRef.current += 1;
    const tick = tickRef.current;
    const h = hashCloudSeed([scenarioId, "lightning", String(tick)]);
    setBoltX(`${14 + (h % 7200) / 100}%`);
    setFlashActive(true);
    void playThunderSound();
    window.setTimeout(() => setFlashActive(false), 450);
  }, [scenarioId]);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    let timeoutId = 0;

    const schedule = () => {
      const h = hashCloudSeed([scenarioId, "storm-schedule", String(tickRef.current)]);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        triggerLightning();
        schedule();
      }, nextLightningDelayMs(h));
      timerRef.current = timeoutId;
    };

    const initial = hashCloudSeed([scenarioId, "storm-start"]);
    timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      triggerLightning();
      schedule();
    }, 2500 + (initial % 4000));
    timerRef.current = timeoutId;

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [scenarioId, reducedMotion, triggerLightning]);

  return (
    <div
      className={["stormWeather", reducedMotion ? "reducedMotion" : ""].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <div className="stormRain" />
      <div className="stormRain stormRainLayerB" />
      <div
        className={["stormLightningBolt", flashActive ? "active" : ""].filter(Boolean).join(" ")}
        style={{ ["--boltX" as string]: boltX }}
      />
      <div className={["stormLightningFlash", flashActive ? "active" : ""].filter(Boolean).join(" ")} />
    </div>
  );
}
