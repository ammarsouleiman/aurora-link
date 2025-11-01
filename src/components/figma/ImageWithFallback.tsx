import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    setDidError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const { src, alt, className, style, fallback, ...rest } = props

  return didError ? (
    fallback ? (
      <>{fallback}</>
    ) : (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--muted)',
        }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={ERROR_IMG_SRC} 
            alt="Error loading image" 
            {...rest} 
            data-original-url={src}
            style={{ maxWidth: '60%', maxHeight: '60%', opacity: 0.5 }}
          />
        </div>
      </div>
    )
  ) : (
    <div className="relative w-full h-full" style={style}>
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse"
          style={{
            borderRadius: 'inherit',
          }}
        >
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img 
        src={src} 
        alt={alt} 
        className={className} 
        style={{
          ...style,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }} 
        {...rest} 
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  )
}
