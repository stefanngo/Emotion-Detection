import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CameraOff, Loader2, Wifi } from 'lucide-react';
import { clsx } from 'clsx';
import { EmotionData } from '../types';

interface Props {
  onScan: (emotions: EmotionData) => void;
  scanFrequency: number;
  isRecording: boolean;
  detectionSensitivity: number;
}

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models/';

export const WebcamScanner: React.FC<Props> = ({ onScan, scanFrequency, isRecording, detectionSensitivity }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for your phone's IP Address
  const [ipUrl, setIpUrl] = useState('const [ipUrl, setIpUrl] = useState('http://192.168.1.13:8080/video');');

    useEffect(() => {
      const loadModels = async () => {
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          ]);
          setIsLoaded(true);
        } catch (err) {
          console.error('Error loading models:', err);
          setError('Failed to load AI models.');
        }
      };
      loadModels();
    }, []);

  useEffect(() => {
    if (!isLoaded || !imgRef.current || !isRecording) return;

    let isMounted = true;
    let timeoutId: number;

    const detect = async () => {
      if (!isMounted || !imgRef.current) return;

      try {
        // AI reads directly from the networked <img> tag now!
        const detections = await faceapi
          .detectSingleFace(imgRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: detectionSensitivity }))
          .withFaceExpressions();

        if (detections && detections.detection.score > detectionSensitivity) {
          onScan(detections.expressions as unknown as EmotionData);
        }
      } catch (err) {
        // Silent catch: MJPEG frames sometimes drop over WiFi, causing momentary read errors
      }

      if (isMounted) {
        timeoutId = window.setTimeout(detect, scanFrequency * 1000);
      }
    };

    // Wait a brief moment for the network image to load before scanning
    setTimeout(detect, 500);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isLoaded, scanFrequency, onScan, isRecording, detectionSensitivity, ipUrl]);

  return (
    <div className="flex flex-col gap-4">
      {/* Network Config UI */}
      <div className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <Wifi className="w-4 h-4 text-emerald-500" />
        <input
          type="text"
          value={ipUrl}
          onChange={(e) => setIpUrl(e.target.value)}
          placeholder="http://192.168.1.13:8080/video"
          className="flex-1 bg-transparent border-none text-sm outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
        />
      </div>

      <div className="relative w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Loading AI Models...</p>
          </div>
        )}

        {/* We use an <img> tag with crossOrigin allowing cross-network data */}
        <img
          ref={imgRef}
          src={isRecording ? ipUrl : ''}
          crossOrigin="anonymous"
          className={clsx(
            "w-full h-full object-cover transition-opacity duration-500",
            isRecording ? "opacity-100" : "opacity-0"
          )}
          alt="IoT Camera Feed"
        />

        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
          <div className={clsx("w-2 h-2 rounded-full", isRecording ? "bg-emerald-500 animate-pulse" : "bg-zinc-500")} />
          <span className="text-[10px] uppercase tracking-wider font-bold text-white">
            {isRecording ? "IoT Sensor Live" : "Sensor Offline"}
          </span>
        </div>
      </div>
    </div>
  );
};