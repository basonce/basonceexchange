import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export default function AnimatedCounter({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  className = '',
  duration = 500
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isIncreasing, setIsIncreasing] = useState<boolean | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsIncreasing(value > prevValue.current);
      prevValue.current = value;
    }

    const startValue = displayValue;
    const diff = value - startValue;
    const steps = 30;
    const stepValue = diff / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
        setTimeout(() => setIsIncreasing(null), 300);
      } else {
        setDisplayValue(prev => prev + stepValue);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span
      className={`${className} ${
        isIncreasing === true
          ? 'text-emerald-400'
          : isIncreasing === false
          ? 'text-red-400'
          : ''
      } transition-colors duration-300`}
    >
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}
