import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-date-fns';
import { EmotionData, DiaryEntry } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin,
  annotationPlugin
);

interface Props {
  scans: { timestamp: number; emotions: EmotionData }[];
  diaryEntries: DiaryEntry[];
}

const EMOTION_COLORS = {
  angry: 'rgb(239, 68, 68)',
  disgusted: 'rgb(168, 85, 247)',
  fearful: 'rgb(249, 115, 22)',
  happy: 'rgb(34, 197, 94)',
  neutral: 'rgb(161, 161, 170)',
  sad: 'rgb(59, 130, 246)',
  surprised: 'rgb(234, 179, 8)',
};

export const EmotionLineGraph: React.FC<Props> = ({ scans, diaryEntries }) => {
  const chartRef = useRef<ChartJS<"line">>(null);

  const data = useMemo(() => {
    const datasets = Object.keys(EMOTION_COLORS).map((emotion) => ({
      label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      data: scans.map((scan) => ({
        x: scan.timestamp,
        y: scan.emotions[emotion as keyof EmotionData],
      })),
      borderColor: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS],
      backgroundColor: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS],
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 10,
      tension: 0.4,
    }));

    return { datasets };
  }, [scans]);

  const options = useMemo(() => {
    const annotations = diaryEntries.reduce((acc, entry, index) => {
      if (entry.timestamp) {
        acc[`line${index}`] = {
          type: 'line',
          xMin: entry.timestamp,
          xMax: entry.timestamp,
          borderColor: 'rgba(161, 161, 170, 0.5)',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: !!entry.annotation,
            content: '← ' + entry.annotation,
            position: 'end',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            color: '#3f3f46',
            font: { size: 10 },
            yAdjust: (index % 3) * 20, // Stagger labels
          },
        };
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const, // Disable animation to prevent snapping back during zoom
      layout: {
        padding: {
          top: 30
        }
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            tooltipFormat: 'PPpp',
          },
          grid: {
            display: false,
          },
        },
        y: {
          min: 0,
          max: 1,
          grid: {
            color: 'rgba(161, 161, 170, 0.1)',
          },
        },
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 6,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(24, 24, 27, 0.9)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as const,
          },
          limits: {
            x: {
              minRange: 5 * 60 * 1000, // 5 minutes
              maxRange: 24 * 60 * 60 * 1000, // 24 hours
            },
            y: {
              min: 0,
              max: 1,
            },
          },
        },
        annotation: {
          annotations,
        },
      },
    };
  }, [diaryEntries]);

  return (
    <div className="w-full h-full">
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};
