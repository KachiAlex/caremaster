import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NativeSplash = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // 3 seconds animation

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#12302C] flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 0.8,
          scale: { duration: 0.5, ease: "easeOut" },
          rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" }
        }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-6">
          <img
            src="/images/caremaster-logo.jpg"
            alt="Care Master"
            className="w-16 h-16 object-contain rounded-lg"
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">Care Master</h1>
          <p className="text-sm text-[#6B9080] font-mono tracking-[0.2em] mt-1">ONE STOP HEALTH CARE</p>
        </motion.div>
      </motion.div>

      {/* Progress bar at bottom */}
      <motion.div 
        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden"
      >
        <motion.div 
          className="h-full bg-[#D4A43D]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
};

export default NativeSplash;
