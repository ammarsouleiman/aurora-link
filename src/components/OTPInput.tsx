import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Input } from './ui/input';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
  autoFocus,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    // Only allow single digit
    if (digit.length > 1) {
      digit = digit[digit.length - 1];
    }

    // Only allow numbers
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newValue = value.split('');
    newValue[index] = digit;
    const updatedValue = newValue.join('').slice(0, length);
    onChange(updatedValue);

    // Move to next input if digit was entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Move to next input on arrow right
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Move to previous input on arrow left
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    const newValue = pastedData.slice(0, length);
    onChange(newValue);

    // Focus last filled input or last input
    const focusIndex = Math.min(newValue.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const digits = value.split('');

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, index) => (
          <Input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={error ? 'true' : 'false'}
            className={`
              w-12 h-14 text-center text-xl
              bg-input-background border-border
              transition-all
              ${error ? 'border-error focus-visible:ring-error' : 'focus-visible:border-primary'}
              ${digits[index] ? 'border-primary' : ''}
            `}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-error text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
