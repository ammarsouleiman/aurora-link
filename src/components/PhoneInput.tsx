import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from './ui/icons';
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
      <div className="flex gap-1.5 sm:gap-2">
        {/* Country Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Select country code"
              disabled={disabled}
              className="w-[100px] xs:w-[110px] sm:w-[130px] justify-between bg-input-background border-border hover:bg-[var(--hover-surface)] transition-colors h-11 sm:h-10 touch-manipulation px-2 sm:px-3"
            >
              <span className="flex items-center gap-1 sm:gap-1.5 truncate min-w-0">
                <span className="text-base sm:text-lg flex-shrink-0">{selectedCountry.flag}</span>
                <span className="text-xs sm:text-sm truncate">{selectedCountry.dialCode}</span>
              </span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[min(320px,calc(100vw-2rem))] p-0" 
            align="start"
            sideOffset={5}
          >
            <Command>
              <CommandInput placeholder="Search country..." className="h-9 text-sm" />
              <CommandList className="max-h-[min(300px,50vh)]">
                <CommandEmpty className="text-sm py-6">No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRY_CODES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode} ${country.code}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="cursor-pointer py-2.5 touch-manipulation"
                    >
                      <span className="mr-2 text-base sm:text-lg flex-shrink-0">{country.flag}</span>
                      <span className="flex-1 truncate text-sm">{country.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs sm:text-sm flex-shrink-0">{country.dialCode}</span>
                      {selectedCountry.code === country.code && (
                        <Check className="ml-2 h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <div className="relative flex-1 min-w-0">
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
              bg-input-background border-border transition-all h-11 sm:h-10 touch-manipulation text-sm sm:text-base
              ${error ? 'border-error focus-visible:ring-error' : ''}
              ${isValid === true ? 'border-success pr-10' : 'pr-3'}
            `}
          />
          {isValid === true && (
            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p id="phone-error" className="text-xs sm:text-sm text-error px-1" role="alert">
          {error}
        </p>
      )}

      {/* Format Hint */}
      {!error && value && (
        <p className="text-[11px] sm:text-xs text-muted-foreground px-1 truncate">
          Format: {selectedCountry.dialCode} {formatPhoneForDisplay(selectedCountry.dialCode, value)}
        </p>
      )}
    </div>
  );
}
