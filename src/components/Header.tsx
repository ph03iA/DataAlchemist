'use client';

import { motion } from 'framer-motion';
import { SparklesIcon, CpuChipIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { APIRateStatus } from './APIRateStatus';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg shadow-blue-500/5"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo and Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-75"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl">
                <SparklesIcon className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Data Alchemist
              </h1>
              <p className="text-xs lg:text-sm text-slate-500 hidden sm:block">
                AI-Powered Resource Allocation
              </p>
            </div>
          </motion.div>

          {/* Navigation Icons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center space-x-4"
          >
            {/* Feature Indicators */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                <CpuChipIcon className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">AI-Powered</span>
              </div>
              <APIRateStatus />
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-lg"
              />
              <span className="text-sm font-medium text-slate-600 hidden sm:block">
                System Active
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
} 