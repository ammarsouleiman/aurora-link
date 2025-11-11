// Local CVA (class-variance-authority) implementation to bypass CDN issues
type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}

type ConfigVariants<T extends Record<string, any>> = {
  [K in keyof T]: {
    [V in keyof T[K]]: string;
  };
};

type VariantProps<T extends (...args: any) => any> = Parameters<T>[0];

export function cva<T extends Record<string, any>>(
  base: string,
  config?: {
    variants?: ConfigVariants<T>;
    defaultVariants?: Partial<{ [K in keyof T]: keyof T[K] }>;
  }
) {
  return (props?: Partial<{ [K in keyof T]: keyof T[K] }> & { className?: string }) => {
    const { className, ...variantProps } = props || {};
    
    const classes = [base];
    
    if (config?.variants && variantProps) {
      Object.keys(config.variants).forEach((variantKey) => {
        const variantValue = (variantProps as any)[variantKey] || config?.defaultVariants?.[variantKey];
        if (variantValue && config.variants![variantKey][variantValue]) {
          classes.push(config.variants![variantKey][variantValue]);
        }
      });
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.filter(Boolean).join(' ');
  };
}

export type { VariantProps };
