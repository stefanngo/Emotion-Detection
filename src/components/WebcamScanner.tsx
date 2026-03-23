import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Failed to load AI models. Please check your connection.');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!isLoaded || !videoRef.current) return;

    let stream: MediaStream | null = null;

    const startVideo = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Webcam access denied. Please enable camera permissions.');
      }
    };

    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isStreaming || !videoRef.current || !isRecording) return;

    let isMounted = true;
    let timeoutId: number;

    const detect = async () => {
      if (!isMounted || !videoRef.current) return;
      
      try {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: detectionSensitivity }))
          .withFaceExpressions();

        if (detections && detections.detection.score > detectionSensitivity) {
          onScan(detections.expressions as unknown as EmotionData);
        }
      } catch (err) {
        console.error('Detection error:', err);
      }

      if (isMounted) {
        timeoutId = window.setTimeout(detect, scanFrequency * 1000);
      }
    };

    detect();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isStreaming, scanFrequency, onScan, isRecording, detectionSensitivity]);

  return (
    <div className="relative w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading AI Models...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center gap-3">
          <CameraOff className="w-8 h-8" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={clsx(
          "w-full h-full object-cover transition-opacity duration-500",
          isStreaming ? "opacity-100" : "opacity-0"
        )}
      />

      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
        <div className={clsx("w-2 h-2 rounded-full", isStreaming ? "bg-emerald-500 animate-pulse" : "bg-zinc-500")} />
        <span className="text-[10px] uppercase tracking-wider font-bold text-white">
          {isStreaming ? "Live Feed" : "Camera Offline"}
        </span>
      </div>
    </div>
  );
};
