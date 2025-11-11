// Local implementation to bypass clsx and tailwind-merge CDN issues
export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | { [key: string]: boolean | undefined | null };

function toVal(mix: ClassValue): string {
  let str = '';
  
  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix;
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          const y = toVal(mix[k]);
          if (y) {
            str && (str += ' ');
            str += y;
          }
        }
      }
    } else {
      for (const k in mix) {
        if (mix[k]) {
          str && (str += ' ');
          str += k;
        }
      }
    }
  }
  
  return str;
}

function clsx(...inputs: ClassValue[]): string {
  let i = 0;
  let tmp;
  let str = '';
  
  while (i < inputs.length) {
    if ((tmp = inputs[i++])) {
      const x = toVal(tmp);
      if (x) {
        str && (str += ' ');
        str += x;
      }
    }
  }
  
  return str;
}

function twMerge(...classes: string[]): string {
  // Simple implementation: just join and deduplicate
  const classStr = classes.filter(Boolean).join(' ');
  const classList = classStr.split(/\s+/).filter(Boolean);
  
  // Group classes by property type (e.g., 'text-', 'bg-', 'p-', etc.)
  const classMap = new Map<string, string>();
  
  for (const cls of classList) {
    // Extract the prefix (property type)
    const match = cls.match(/^([a-z]+(?:-[a-z]+)?)-/);
    const prefix = match ? match[1] : cls;
    
    // Later classes override earlier ones with the same prefix
    classMap.set(prefix + ':' + cls, cls);
  }
  
  return Array.from(classMap.values()).join(' ');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
