import React from 'react';
import { BookOpen, Calendar, MessageSquare, Clock } from 'lucide-react';
import { DiaryEntry } from '../types';
import { EmotionRadar } from './EmotionRadar';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  entries: DiaryEntry[];
  onUpdateAnnotation: (id: string, annotation: string) => void;
}

export const EmotionDiary: React.FC<Props> = ({ entries, onUpdateAnnotation }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-500" />
          <h2 className="font-semibold text-zinc-900 dark:text-white text-lg">Emotion Diary</h2>
        </div>
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
          {entries.length} Entries
        </span>
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl"
            >
              <Calendar className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No diary entries yet. Keep working!</p>
            </motion.div>
          ) : (
            entries.slice().reverse().map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 transition-colors duration-300"
              >
                <div className="p-6 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-bold font-mono">
                      {entry.startTime} - {entry.endTime}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-4">
                    Session Summary
                  </p>
                  
                  <div className="flex-1">
                    <div className="space-y-2">
                      {Object.entries(entry.averageEmotions)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .slice(0, 3)
                        .map(([emotion, value]) => (
                          <div key={emotion} className="flex items-center justify-between">
                            <span className="text-xs capitalize text-zinc-600 dark:text-zinc-400">{emotion}</span>
                            <div className="flex items-center gap-2 flex-1 ml-4">
                              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full flex-1 overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${(value as number) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 w-8">
                                {Math.round((value as number) * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="h-[250px] md:h-auto border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800">
                  <EmotionRadar data={entry.averageEmotions} label="Session Average" />
                </div>

                <div className="p-6 flex flex-col gap-3 bg-zinc-50/50 dark:bg-zinc-800/50">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <MessageSquare className="w-3 h-3" />
                    Activity Annotation
                  </label>
                  <textarea
                    placeholder="What were you doing during this time?"
                    value={entry.annotation}
                    onChange={(e) => onUpdateAnnotation(entry.id, e.target.value)}
                    className="flex-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  />
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
