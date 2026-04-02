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
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  // Reverted to your preferred IP default
  const [sourceType, setSourceType] = useState<'webcam' | 'ip'>('ip');
  const [ipUrl, setIpUrl] = useState('http://192.168.1.13:8080/video');
  const [isPiPMode, setIsPiPMode] = useState(false);

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

  // Reverted to your stable stream logic
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
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [sourceType, isRecording]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsPiPMode(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isLoaded || !isRecording) return;

    let isMounted = true;
    let timeoutId: number;

    const detect = async () => {
      const activeElement = sourceType === 'webcam' ? videoRef.current : imgRef.current;

      if (!isMounted || !activeElement) return;

      try {
        const detections = await faceapi
          .detectSingleFace(activeElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: detectionSensitivity }))
          .withFaceExpressions();

        if (detections && detections.detection.score > detectionSensitivity) {
          onScan(detections.expressions as unknown as EmotionData);
        } else {
          // Kept the Drop to Zero fix
          onScan({ angry: 0, disgusted: 0, fearful: 0, happy: 0, neutral: 0, sad: 0, surprised: 0 });
        }
      } catch (err) {
        // Silent catch
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

      {/* Kept the layout fix so it doesn't flash full screen */}
      <div ref={containerRef} className="w-full aspect-video">
        <div className={clsx(
          "bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800",
          isPiPMode
            ? "fixed bottom-6 right-6 w-64 aspect-video shadow-2xl rounded-2xl z-50"
            : "relative w-full h-full rounded-2xl shadow-inner z-10"
        )}>
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3 z-30">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Loading AI Models...</p>
            </div>
          )}

          {sourceType === 'webcam' ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={clsx(
                "w-full h-full object-cover",
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
                "w-full h-full object-cover",
                isRecording ? "opacity-100" : "opacity-0"
              )}
            />
          )}

          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 z-30">
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