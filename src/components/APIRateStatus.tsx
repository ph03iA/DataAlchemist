'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface APIRateStatusProps {
  className?: string;
}

export function APIRateStatus({ className }: APIRateStatusProps) {
  const [status, setStatus] = useState<'good' | 'warning' | 'limited'>('good');
  const [requestsLeft, setRequestsLeft] = useState(15);
  const [resetTime, setResetTime] = useState<Date | null>(null);

  useEffect(() => {
    // Listen for rate limit events from the AI provider
    const handleRateLimit = (event: CustomEvent) => {
      const { requests, maxRequests, resetTime: reset } = event.detail;
      setRequestsLeft(maxRequests - requests);
      setResetTime(new Date(reset));
      
      if (requests >= maxRequests) {
        setStatus('limited');
      } else if (requests >= maxRequests * 0.8) {
        setStatus('warning');
      } else {
        setStatus('good');
      }
    };

    // Add event listener if in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('ai-rate-limit' as any, handleRateLimit);
      return () => window.removeEventListener('ai-rate-limit' as any, handleRateLimit);
    }
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'limited': return 'text-red-600 bg-red-100';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good': return CheckCircleIcon;
      case 'warning': return ExclamationTriangleIcon;
      case 'limited': return SignalIcon;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'good': return `AI Ready (${requestsLeft} requests left)`;
      case 'warning': return `AI Busy (${requestsLeft} requests left)`;
      case 'limited': return 'AI Rate Limited';
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        getStatusColor(),
        className
      )}
    >
      <StatusIcon className="h-4 w-4" />
      <span>{getStatusText()}</span>
      {resetTime && status === 'limited' && (
        <span className="text-xs opacity-75">
          (resets in {Math.ceil((resetTime.getTime() - Date.now()) / 1000)}s)
        </span>
      )}
    </motion.div>
  );
} 