
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 64 }) => {
  // 52 weeks in a year
  const totalWeeks = 52;
  const goldenAngle = 137.508; // The angle that creates organic patterns (sunflower)
  
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={`${className} overflow-visible`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pixelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {Array.from({ length: totalWeeks }).map((_, i) => {
        // Calculate spiral coordinates
        const r = 6 * Math.sqrt(i + 4); // Scale radius (with inner hole)
        const angle = i * goldenAngle * (Math.PI / 180);
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        
        // Squares get smaller towards the center
        const rectSize = 3 + (i / totalWeeks) * 4;
        const opacity = 0.1 + (i / totalWeeks) * 0.7;
        
        // The "Current Week" is the last one
        const isCurrent = i === totalWeeks - 1;

        return (
          <rect
            key={i}
            x={x - rectSize / 2}
            y={y - rectSize / 2}
            width={rectSize}
            height={rectSize}
            rx={rectSize * 0.3}
            fill={isCurrent ? "url(#pixelGradient)" : "#86efac"}
            className={isCurrent ? "animate-pulse" : ""}
            style={{ 
              opacity: isCurrent ? 1 : opacity,
              filter: isCurrent ? "url(#glow)" : "none",
              transformOrigin: `${x}px ${y}px`,
              transform: `rotate(${angle * (180 / Math.PI) + 45}deg)`
            }}
          />
        );
      })}
    </svg>
  );
};

export default Logo;
