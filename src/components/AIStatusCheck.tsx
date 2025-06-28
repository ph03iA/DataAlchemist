'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CpuChipIcon,
  SparklesIcon,
  EyeSlashIcon,
  KeyIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

export function AIStatusCheck() {
  const [isVisible, setIsVisible] = useState(true);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'available' | 'missing'>('checking');

  useEffect(() => {
    // Check for API key
    const checkApiKey = () => {
      const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY;
      if (apiKey && apiKey.length > 10) {
        setApiKeyStatus('available');
      } else {
        setApiKeyStatus('missing');
      }
    };

    const timer = setTimeout(checkApiKey, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const statusConfig = {
    checking: {
      icon: CpuChipIcon,
      title: 'Checking AI Services...',
      message: 'Verifying AI provider connections',
      bg: 'from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      iconBg: 'from-blue-500 to-indigo-500',
      textColor: 'text-blue-800',
      messageColor: 'text-blue-600'
    },
    available: {
      icon: SparklesIcon,
      title: '🚀 AI Services Active',
      message: 'Google Gemini API connected and ready for advanced data processing',
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      iconBg: 'from-green-500 to-emerald-500',
      textColor: 'text-green-800',
      messageColor: 'text-green-600'
    },
    missing: {
      icon: ExclamationTriangleIcon,
      title: '⚠️ Limited Functionality',
      message: 'AI features are running in fallback mode. Some advanced features may be limited.',
      bg: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      iconBg: 'from-yellow-500 to-amber-500',
      textColor: 'text-yellow-800',
      messageColor: 'text-yellow-600'
    }
  };

  const config = statusConfig[apiKeyStatus];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className={cn(
          'relative p-4 lg:p-6 rounded-2xl border-2 backdrop-blur-sm shadow-lg',
          'bg-gradient-to-br', config.bg, config.border
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent rounded-2xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Animated Icon */}
              <div className="relative">
                <motion.div
                  animate={apiKeyStatus === 'checking' ? { rotate: 360 } : {}}
                  transition={{ duration: 2, repeat: apiKeyStatus === 'checking' ? Infinity : 0, ease: "linear" }}
                  className={cn('p-3 rounded-xl bg-gradient-to-r shadow-lg', config.iconBg)}
                >
                  <config.icon className="h-6 w-6 text-white" />
                </motion.div>
                
                {/* Status indicator dot */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className={cn(
                    'absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
                    apiKeyStatus === 'available' ? 'bg-green-500' :
                    apiKeyStatus === 'missing' ? 'bg-yellow-500' : 'bg-blue-500'
                  )}
                />
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <motion.h4
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn('font-bold text-lg', config.textColor)}
                >
                  {config.title}
                </motion.h4>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={cn('text-sm', config.messageColor)}
                >
                  {config.message}
                </motion.p>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1 bg-white/60 rounded-full border border-white/40 backdrop-blur-sm">
                <CpuChipIcon className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Smart Validation</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-white/60 rounded-full border border-white/40 backdrop-blur-sm">
                <SparklesIcon className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">AI Processing</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-white/60 rounded-full border border-white/40 backdrop-blur-sm">
                <WifiIcon className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Real-time</span>
              </div>
            </div>

            {/* Dismiss Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              onClick={handleDismiss}
              className="ml-4 p-2 bg-white/60 hover:bg-white/80 rounded-xl border border-white/40 backdrop-blur-sm transition-all duration-200 hover:scale-105"
            >
              <EyeSlashIcon className="h-4 w-4 text-slate-600" />
            </motion.button>
          </div>

          {/* Progress Bar (for checking state) */}
          {apiKeyStatus === 'checking' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 bg-white/60 rounded-full h-2 overflow-hidden"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              />
            </motion.div>
          )}

          {/* Feature List (for available state) */}
          {apiKeyStatus === 'available' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 lg:hidden"
            >
              {[
                { icon: CpuChipIcon, text: 'Smart Validation' },
                { icon: SparklesIcon, text: 'AI Processing' },
                { icon: WifiIcon, text: 'Real-time' }
              ].map((feature, index) => (
                <div key={feature.text} className="flex items-center space-x-2 px-3 py-2 bg-white/60 rounded-lg border border-white/40">
                  <feature.icon className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{feature.text}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Setup Instructions (for missing state) */}
          {apiKeyStatus === 'missing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 p-3 bg-white/60 rounded-lg border border-white/40"
            >
              <div className="flex items-start space-x-3">
                <KeyIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    Enable Full AI Features
                  </p>
                  <p className="text-xs text-yellow-700">
                    Add your Google Gemini API key to <code className="bg-yellow-100 px-1 rounded">.env.local</code> to unlock advanced AI capabilities.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 