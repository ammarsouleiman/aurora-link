import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { COUNTRY_CODES, type CountryCode, validatePhoneNumber, formatPhoneForDisplay } from '../utils/phone';

interface PhoneInputProps {
  value: string;
  dialCode: string;
  onChange: (phone: string, dialCode: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PhoneInput({
  value,
  dialCode,
  onChange,
  onValidationChange,
  error,
  disabled,
  autoFocus,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES.find(c => c.dialCode === dialCode) || COUNTRY_CODES[0]
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const country = COUNTRY_CODES.find(c => c.dialCode === dialCode);
    if (country) {
      setSelectedCountry(country);
    }
  }, [dialCode]);

  useEffect(() => {
    if (value && onValidationChange) {
      onValidationChange(validatePhoneNumber(value));
    }
  }, [value, onValidationChange]);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    onChange(value, country.dialCode);
    setOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, spaces, hyphens, and parentheses
    const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '');
    onChange(cleaned, selectedCountry.dialCode);
  };

  const isValid = value ? validatePhoneNumber(value) : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Country Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Select country code"
              disabled={disabled}
              className="w-[140px] justify-between bg-input-background border-border hover:bg-[var(--hover-surface)] transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span>{selectedCountry.dialCode}</span>
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." className="h-9" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRY_CODES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode} ${country.code}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="cursor-pointer"
                    >
                      <span className="mr-2 text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground ml-2">{country.dialCode}</span>
                      {selectedCountry.code === country.code && (
                        <Check className="ml-2 h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            placeholder={selectedCountry.placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'phone-error' : undefined}
            className={`
              bg-input-background border-border transition-all
              ${error ? 'border-error focus-visible:ring-error' : ''}
              ${isValid === true ? 'border-success' : ''}
            `}
          />
          {isValid === true && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check className="h-4 w-4 text-success" />
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p id="phone-error" className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {/* Format Hint */}
      {!error && value && (
        <p className="text-xs text-muted-foreground">
          Format: {selectedCountry.dialCode} {formatPhoneForDisplay(selectedCountry.dialCode, value)}
        </p>
      )}
    </div>
  );
}
