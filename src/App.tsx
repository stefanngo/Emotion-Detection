import mqtt from 'mqtt';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WebcamScanner } from './components/WebcamScanner';
import { EmotionRadar } from './components/EmotionRadar';
import { EmotionLineGraph } from './components/EmotionLineGraph';
import { SettingsPanel } from './components/SettingsPanel';
import { EmotionDiary } from './components/EmotionDiary';
import { EmotionData, DiaryEntry, AppSettings } from './types';
import { Brain, Sparkles, LayoutDashboard, History, Moon, Sun, Play, Square, Download, FileText } from 'lucide-react';

// DB IMPORTS
import { saveScanToDB, getRecentScans } from './lib/db';

// CSV-EXPORT IMPORTS
import { downloadCSV, downloadPDF } from './lib/export';

const INITIAL_SETTINGS: AppSettings = {
  scanFrequency: 5,
  reportFrequency: 60,
  detectionSensitivity: 0.3,
};

const INITIAL_EMOTIONS: EmotionData = {
  angry: 0,
  disgusted: 0,
  fearful: 0,
  happy: 0,
  neutral: 1,
  sad: 0,
  surprised: 0,
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('emotion-tracker-settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [currentEmotions, setCurrentEmotions] = useState<EmotionData>(INITIAL_EMOTIONS);
  const [scans, setScans] = useState<{ timestamp: number; emotions: EmotionData }[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => {
    const saved = localStorage.getItem('emotion-tracker-diary');
    return saved ? JSON.parse(saved) : [];
  });

  const [isRecording, setIsRecording] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('emotion-tracker-theme');
    return saved === 'dark';
  });

  const lastReportTimeRef = useRef<Date>(new Date());

  // MQTT & Debounce References
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);
  const lastPublishedEmotionRef = useRef<string>("");

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        const historicalRecords = await getRecentScans(24);
        const formattedScans = historicalRecords.map(record => ({
          timestamp: record.timestamp,
          emotions: record.emotions
        }));
        setScans(formattedScans);
      } catch (error) {
        console.error("Failed to load historical data from DB:", error);
      }
    };

    loadHistoricalData();
  }, []);

  // --- MQTT SHIFTR.IO CONNECTION ---
  useEffect(() => {
    const shiftrUrl = 'wss://emotion-twin:IQMJdZL2vKfM6x3r@emotion-twin.cloud.shiftr.io:443';

    // We add a random number to the ID so refreshing the page doesn't cause a collision
    const client = mqtt.connect(shiftrUrl, {
      clientId: 'React-AI-' + Math.floor(Math.random() * 10000)
    });

    client.on('connect', () => {
      console.log('React is successfully connected to Shiftr.io!');
    });

    client.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
    });

    mqttClientRef.current = client;

    // Cleanup connection when user leaves the page
    return () => {
      if (client) client.end();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('emotion-tracker-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('emotion-tracker-diary', JSON.stringify(diaryEntries));
  }, [diaryEntries]);

  useEffect(() => {
    localStorage.setItem('emotion-tracker-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const generateReport = useCallback(() => {
    const newScans = scans.filter(scan => scan.timestamp > lastReportTimeRef.current.getTime());
    if (newScans.length === 0) {
      lastReportTimeRef.current = new Date();
      return;
    }

    const average = newScans.reduce(
      (acc, scan) => {
        Object.keys(scan.emotions).forEach((key) => {
          acc[key as keyof EmotionData] += scan.emotions[key as keyof EmotionData];
        });
        return acc;
      },
      { ...INITIAL_EMOTIONS, neutral: 0 }
    );

    Object.keys(average).forEach((key) => {
      average[key as keyof EmotionData] /= newScans.length;
    });

    const now = new Date();
    const formatTime = (date: Date) =>
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: DiaryEntry = {
      id: crypto.randomUUID(),
      startTime: formatTime(lastReportTimeRef.current),
      endTime: formatTime(now),
      averageEmotions: average,
      annotation: '',
      timestamp: now.getTime(),
    };

    setDiaryEntries((prev) => [...prev, newEntry]);
    lastReportTimeRef.current = now;
  }, [scans]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diffMinutes = (now.getTime() - lastReportTimeRef.current.getTime()) / (1000 * 60);

      if (diffMinutes >= settings.reportFrequency) {
        generateReport();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [settings.reportFrequency, generateReport]);

  // --- DATABASE & MQTT WRITE LOGIC ---
  const handleScan = useCallback((emotions: EmotionData) => {
    setCurrentEmotions(emotions);

    // 1. Calculate the dominant emotion
    const expressions = emotions as unknown as Record<string, number>;
    const dominant = Object.keys(expressions).reduce((a, b) =>
      expressions[a] > expressions[b] ? a : b
    );

    // 2. THE DEBOUNCE SHIELD
    // Only send the message if the emotion is DIFFERENT from the last one we sent
    if (dominant !== lastPublishedEmotionRef.current) {
      if (mqttClientRef.current && mqttClientRef.current.connected) {
        mqttClientRef.current.publish('smartroom/emotion', dominant);
        console.log("Successfully published:", dominant);

        // Save this emotion to the memory bank so we don't spam it again!
        lastPublishedEmotionRef.current = dominant;
      }
    }

    // 3. Save to Database
    saveScanToDB(emotions).catch(console.error);

    // 4. Update UI
    setScans((prev) => {
      const newScans = [...prev, { timestamp: Date.now(), emotions }];
      if (newScans.length > 5000) return newScans.slice(newScans.length - 5000);
      return newScans;
    });
  }, []);

  const updateAnnotation = (id: string, annotation: string) => {
    setDiaryEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, annotation } : entry))
    );
  };

  const handleEmotionClick = useCallback((emotion: string) => {
    if (scans.length === 0 && diaryEntries.length === 0) {
      alert(`No historical data found for ${emotion}.`);
      return;
    }

    let maxSpike = -1;
    let maxTimestamp = 0;
    let activity = 'Current Session';

    diaryEntries.forEach((entry) => {
      const val = entry.averageEmotions[emotion as keyof EmotionData];
      if (val > maxSpike) {
        maxSpike = val;
        maxTimestamp = entry.timestamp;
        activity = entry.annotation || 'Unannotated Session';
      }
    });

    scans.forEach((scan) => {
      const val = scan.emotions[emotion as keyof EmotionData];
      if (val > maxSpike) {
        maxSpike = val;
        maxTimestamp = scan.timestamp;

        activity = 'Current Session';
        for (const entry of diaryEntries) {
          if (entry.timestamp && scan.timestamp <= entry.timestamp) {
            activity = entry.annotation || 'Unannotated Session';
            break;
          }
        }
      }
    });

    if (maxSpike === -1) return;

    const emotionName = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    const valueStr = (maxSpike * 100).toFixed(1);
    const timeString = new Date(maxTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    alert(`Highest peak for ${emotionName}: ${valueStr}% at ${timeString} during ${activity}.`);
  }, [scans, diaryEntries]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-20 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-900 dark:text-white leading-none">EmotionDiary</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">AI Productivity Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors duration-300">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Session Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Controls & Real-time */}
          <div className="lg:col-span-4 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Real-time Feed</h2>
                </div>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isRecording
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3 h-3" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Start Recording
                    </>
                  )}
                </button>
              </div>
              <WebcamScanner
                onScan={handleScan}
                scanFrequency={settings.scanFrequency}
                isRecording={isRecording}
                detectionSensitivity={settings.detectionSensitivity}
              />
            </section>

            <SettingsPanel settings={settings} onChange={setSettings} />

            <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1">Next Report</h3>
                <p className="text-emerald-100 text-sm opacity-80">
                  Your emotional data is being bundled.
                  {scans.length} scans collected so far.
                </p>
                <button
                  onClick={generateReport}
                  className="mt-4 px-4 py-2 bg-white text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors"
                >
                  Generate Now
                </button>
              </div>
              <Brain className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* Analytics Export Controls */}
            <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Data Analytics</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadCSV}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Raw CSV
                </button>
                <button
                  id="pdf-btn"
                  onClick={() => downloadPDF('analytics-dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-xl text-xs font-bold transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF Report
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Visualization & Diary */}
          <div id="analytics-dashboard" className="lg:col-span-8 space-y-8">
            <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Live Analysis</h2>
                  <p className="text-sm text-zinc-400">Current emotional distribution from webcam</p>
                </div>
                <div className="flex items-center gap-1">
                  {(Object.entries(currentEmotions) as [string, number][])
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 1)
                    .map(([emotion]) => (
                      <span key={emotion} className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Dominant: {emotion}
                      </span>
                    ))}
                </div>
              </div>
              <div className="h-[400px]">
                <EmotionRadar data={currentEmotions} onEmotionClick={handleEmotionClick} />
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Emotional Trends</h2>
                <p className="text-sm text-zinc-400">Longitudinal emotional data over time</p>
              </div>
              <div className="h-[400px]">
                <EmotionLineGraph scans={scans} diaryEntries={diaryEntries} />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <History className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Session History</h2>
              </div>
              <EmotionDiary entries={diaryEntries} onUpdateAnnotation={updateAnnotation} />
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}