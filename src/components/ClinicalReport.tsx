import React, { useMemo } from 'react';
import { Brain, Activity, Clock } from 'lucide-react';
import { EmotionData, DiaryEntry } from '../types';
import { EmotionRadar } from './EmotionRadar';
import { EmotionLineGraph } from './EmotionLineGraph';

interface Props {
    scans: { timestamp: number; emotions: EmotionData }[];
    diaryEntries: DiaryEntry[];
    sessionAverage: EmotionData;
}

export const ClinicalReport: React.FC<Props> = ({ scans, diaryEntries, sessionAverage }) => {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // 1. ZOOM FIX: Filter BOTH scans and diary entries to strictly the last 24 hours
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    const last24hScans = useMemo(() => {
        return scans.filter(scan => scan.timestamp >= twentyFourHoursAgo);
    }, [scans, twentyFourHoursAgo]);

    const last24hDiary = useMemo(() => {
        return diaryEntries.filter(entry => entry.timestamp >= twentyFourHoursAgo);
    }, [diaryEntries, twentyFourHoursAgo]);

    // 2. THE ANOMALY FILTER: Clean up the table
    const significantEntries = useMemo(() => {
        return diaryEntries.filter(entry => {
            const dominant = Object.keys(entry.averageEmotions).reduce((a, b) =>
                entry.averageEmotions[a as keyof EmotionData] > entry.averageEmotions[b as keyof EmotionData] ? a : b
            );
            return dominant !== 'neutral' || entry.annotation.trim() !== '';
        });
    }, [diaryEntries]);

    return (
        <div id="clinical-pdf-target" className="w-[794px] bg-white text-zinc-900 p-12 font-sans min-h-[1123px]">

            {/* Report Header */}
            <div className="flex items-start justify-between border-b-2 border-zinc-200 pb-6 mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center">
                        <Brain className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="font-bold text-2xl tracking-tight">EmotionDiary</h1>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clinical Telemetry Report</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Generated On</p>
                    <p className="text-md font-medium text-zinc-900">{currentDate}</p>
                    <p className="text-xs text-zinc-500 mt-1">ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                </div>
            </div>

            {/* THE LAYOUT FIX: Stacking the graphs vertically so the timeline has full width to breathe */}

            {/* Radar Chart Section */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800">Session Aggregate</h2>
                </div>
                {/* We keep the radar centered and moderately sized since it's a circle */}
                <div className="h-[350px] w-full max-w-md mx-auto bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <EmotionRadar data={sessionAverage} onEmotionClick={() => { }} />
                </div>
            </div>

            {/* Line Graph Section */}
            <div className="mb-12">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800">Last 24 Hours</h2>
                </div>
                {/* Full width container so the dates and legends don't overlap! */}
                <div className="h-[350px] w-full bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <EmotionLineGraph scans={last24hScans} diaryEntries={last24hDiary} />
                </div>
            </div>

            {/* Diary Table */}
            <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4 border-b border-zinc-100 pb-2">
                    Significant Emotion Blocks
                </h2>

                {significantEntries.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic">No significant non-neutral emotions detected in this session yet.</p>
                ) : (
                    <table className="w-full text-sm text-left mb-8">
                        <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-wider text-zinc-500">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">Time</th>
                                <th className="px-4 py-3">Dominant Emotion</th>
                                <th className="px-4 py-3 rounded-tr-lg">User Annotation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {significantEntries.map((entry) => {
                                const dominant = Object.keys(entry.averageEmotions).reduce((a, b) =>
                                    entry.averageEmotions[a as keyof EmotionData] > entry.averageEmotions[b as keyof EmotionData] ? a : b
                                );

                                return (
                                    <tr key={entry.id}>
                                        <td className="px-4 py-4 font-medium whitespace-nowrap">{entry.startTime} - {entry.endTime}</td>
                                        <td className="px-4 py-4 capitalize">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${dominant === 'angry' ? 'bg-red-100 text-red-700' :
                                                    dominant === 'happy' ? 'bg-emerald-100 text-emerald-700' :
                                                        dominant === 'sad' ? 'bg-blue-100 text-blue-700' :
                                                            dominant === 'fearful' ? 'bg-orange-100 text-orange-700' :
                                                                dominant === 'surprised' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-zinc-100 text-zinc-700'
                                                }`}>
                                                {dominant}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-zinc-600">{entry.annotation || '--'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-zinc-200 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    EmotionDiary AIoT Tracker • Automated Document Generation
                </p>
            </div>

        </div>
    );
};