import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { EmotionData } from '../types';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController
);

interface Props {
  data: EmotionData;
  label?: string;
  onEmotionClick?: (emotion: string) => void;
}

export const EmotionRadar: React.FC<Props> = ({ data, label = 'Current Emotions', onEmotionClick }) => {
  const chartData = {
    labels: ['Happy', 'Sad', 'Angry', 'Fearful', 'Disgusted', 'Surprised', 'Neutral'],
    datasets: [
      {
        label: label,
        data: [
          data.happy,
          data.sad,
          data.angry,
          data.fearful,
          data.disgusted,
          data.surprised,
          data.neutral,
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
      },
    ],
  };

  const options = {
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        suggestedMin: 0,
        suggestedMax: 1,
        ticks: {
          display: false,
        },
        pointLabels: {
          font: {
            family: 'Inter',
            size: 11,
            weight: 500,
          },
          color: '#71717a',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
    onClick: (event: any, elements: any[], chart: any) => {
      if (elements.length > 0 && onEmotionClick) {
        const index = elements[0].index;
        const emotionLabel = chartData.labels[index];
        onEmotionClick(emotionLabel.toLowerCase());
      }
    },
  };

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4">
      <Radar data={chartData} options={options as any} />
    </div>
  );
};
