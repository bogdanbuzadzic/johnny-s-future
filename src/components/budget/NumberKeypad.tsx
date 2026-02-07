import { Delete } from 'lucide-react';
import { motion } from 'framer-motion';

interface NumberKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxDecimals?: number;
}

export function NumberKeypad({ value, onChange, maxDecimals = 2 }: NumberKeypadProps) {
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === '.') {
      // Only allow one decimal point
      if (value.includes('.')) return;
      // Don't start with decimal
      if (value === '') {
        onChange('0.');
        return;
      }
      onChange(value + '.');
      return;
    }

    // Check decimal places
    const parts = value.split('.');
    if (parts.length === 2 && parts[1].length >= maxDecimals) {
      return;
    }

    // Remove leading zeros (except for decimals)
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }

    onChange(value + key);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {keys.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => handleKeyPress(key)}
          className="glass-light w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-medium mx-auto"
        >
          {key === 'backspace' ? (
            <Delete className="w-5 h-5" strokeWidth={1.5} />
          ) : (
            key
          )}
        </motion.button>
      ))}
    </div>
  );
}
