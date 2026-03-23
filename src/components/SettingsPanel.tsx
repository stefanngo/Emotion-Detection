import React from 'react';
import { Settings, Clock, Activity } from 'lucide-react';
import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export const SettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 transition-colors duration-300">
      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <Settings className="w-5 h-5 text-zinc-400" />
        <h2 className="font-semibold text-zinc-900 dark:text-white">Session Controls</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <Activity className="w-3 h-3" />
            Scan Frequency
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="30"
              value={settings.scanFrequency}
              onChange={(e) => onChange({ ...settings, scanFrequency: parseInt(e.target.value) })}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 w-12 text-right">
              {settings.scanFrequency}s
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">How often the AI analyzes your facial expression.</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            Report Frequency
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={settings.reportFrequency}
              onChange={(e) => onChange({ ...settings, reportFrequency: parseInt(e.target.value) })}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 w-12 text-right">
              {settings.reportFrequency}m
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Interval for bundling scans into a diary entry.</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <Activity className="w-3 h-3" />
            Detection Sensitivity
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={settings.detectionSensitivity}
              onChange={(e) => onChange({ ...settings, detectionSensitivity: parseFloat(e.target.value) })}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 w-12 text-right">
              {settings.detectionSensitivity}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Minimum face detection confidence score.</p>
        </div>
      </div>
    </div>
  );
};
