import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Loader2, Wifi, Camera, Monitor } from 'lucide-react';
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
  // References for both media types
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [isLoaded, setIsLoaded] = useState(false);
  const [sourceType, setSourceType] = useState<'webcam' | 'ip'>('ip');
  const [ipUrl, setIpUrl] = useState('http://192.168.1.13:8080/video');
  const [isPiPMode, setIsPiPMode] = useState(false);

  // 1. Load AI Models
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
      }
    };
    loadModels();
  }, []);

  // 2. Handle Laptop Webcam Stream
  useEffect(() => {
    if (sourceType === 'webcam' && isRecording && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Webcam error:", err));
    } else if (!isRecording && videoRef.current?.srcObject) {
      // Turn off webcam when not recording
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [sourceType, isRecording]);

  // 3. The Scroll Tripwire
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsPiPMode(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 4. The AI Scanning Logic (Works on both Image and Video)
  useEffect(() => {
    if (!isLoaded || !isRecording) return;

    let isMounted = true;
    let timeoutId: number;

    const detect = async () => {
      // Determine which HTML element we are actively scanning
      const activeElement = sourceType === 'webcam' ? videoRef.current : imgRef.current;

      if (!isMounted || !activeElement) return;

      try {
        const detections = await faceapi
          .detectSingleFace(activeElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: detectionSensitivity }))
          .withFaceExpressions();

        if (detections && detections.detection.score > detectionSensitivity) {
          onScan(detections.expressions as unknown as EmotionData);
        }
      } catch (err) {
        // Silent catch for dropped frames
      }

      if (isMounted) {
        timeoutId = window.setTimeout(detect, scanFrequency * 1000);
      }
    };

    setTimeout(detect, 500);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isLoaded, scanFrequency, onScan, isRecording, detectionSensitivity, sourceType, ipUrl]);

  return (
    <div className="flex flex-col gap-4">
      {/* Source Toggle UI */}
      <div className="flex gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
        <button
          onClick={() => setSourceType('webcam')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
            sourceType === 'webcam'
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Monitor className="w-4 h-4" />
          Laptop Webcam
        </button>
        <button
          onClick={() => setSourceType('ip')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
            sourceType === 'ip'
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Camera className="w-4 h-4" />
          IP Camera
        </button>
      </div>

      {/* IP URL Input (Only visible when IP Camera is selected) */}
      {sourceType === 'ip' && (
        <div className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <Wifi className="w-4 h-4 text-emerald-500" />
          <input
            type="text"
            value={ipUrl}
            onChange={(e) => setIpUrl(e.target.value)}
            placeholder="http://192.168.1.X:8080/video"
            className="flex-1 bg-transparent border-none text-sm outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
          />
        </div>
      )}

      {/* Video Container with PiP Logic */}
      <div ref={containerRef} className="relative w-full aspect-video">
        <div className={clsx(
          "bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-all duration-300",
          isPiPMode
            ? "fixed bottom-6 right-6 w-64 aspect-video shadow-2xl rounded-2xl z-50"
            : "absolute inset-0 w-full h-full rounded-2xl shadow-inner z-10"
        )}>

          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3 z-20">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Loading AI Models...</p>
            </div>
          )}

          {/* Conditional Media Rendering */}
          {sourceType === 'webcam' ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={clsx(
                "w-full h-full object-cover transition-opacity duration-500",
                isRecording ? "opacity-100" : "opacity-0"
              )}
            />
          ) : (
            <img
              ref={imgRef}
              src={isRecording ? ipUrl : ''}
              crossOrigin="anonymous"
              alt="IoT Camera Feed"
              className={clsx(
                "w-full h-full object-cover transition-opacity duration-500",
                isRecording ? "opacity-100" : "opacity-0"
              )}
            />
          )}

          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 z-20">
            <div className={clsx("w-2 h-2 rounded-full", isRecording ? "bg-emerald-500 animate-pulse" : "bg-zinc-500")} />
            <span className="text-[10px] uppercase tracking-wider font-bold text-white">
              {isRecording ? "Sensor Live" : "Sensor Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};