interface TruckSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function TruckSpinner({ size = 'md', text }: TruckSpinnerProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Road */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 rounded-full overflow-hidden">
          <div className="h-full bg-gray-400 animate-road-scroll"></div>
        </div>

        {/* Truck Container */}
        <div className="absolute inset-0 animate-truck-bounce">
          {/* Truck Body */}
          <svg
            viewBox="0 0 100 80"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cargo area */}
            <rect
              x="10"
              y="25"
              width="35"
              height="30"
              rx="3"
              fill="#FF6B6B"
              stroke="#E85555"
              strokeWidth="2"
            />
            
            {/* Cargo details */}
            <rect x="15" y="30" width="10" height="10" rx="1" fill="#FFD93D" opacity="0.8" />
            <rect x="28" y="30" width="10" height="10" rx="1" fill="#6BCB77" opacity="0.8" />
            <rect x="15" y="42" width="10" height="8" rx="1" fill="#4D96FF" opacity="0.8" />
            
            {/* Cabin */}
            <path
              d="M 45 35 L 45 55 L 65 55 L 70 45 L 70 35 Z"
              fill="#4ECDC4"
              stroke="#3DBDB3"
              strokeWidth="2"
            />
            
            {/* Window */}
            <path
              d="M 50 38 L 50 48 L 63 48 L 66 42 L 66 38 Z"
              fill="#95E1D3"
              opacity="0.6"
            />
            
            {/* Windshield reflection */}
            <ellipse cx="58" cy="41" rx="3" ry="2" fill="white" opacity="0.4" />
            
            {/* Front bumper */}
            <rect
              x="68"
              y="50"
              width="8"
              height="5"
              rx="1"
              fill="#3DBDB3"
            />
            
            {/* Wheels */}
            <g className="animate-wheel-spin" style={{ transformOrigin: '25px 62px' }}>
              <circle cx="25" cy="62" r="8" fill="#2D3436" />
              <circle cx="25" cy="62" r="5" fill="#636E72" />
              <circle cx="25" cy="62" r="2" fill="#B2BEC3" />
            </g>
            
            <g className="animate-wheel-spin" style={{ transformOrigin: '60px 62px' }}>
              <circle cx="60" cy="62" r="8" fill="#2D3436" />
              <circle cx="60" cy="62" r="5" fill="#636E72" />
              <circle cx="60" cy="62" r="2" fill="#B2BEC3" />
            </g>

            {/* Exhaust smoke */}
            <g className="animate-smoke">
              <circle cx="12" cy="52" r="2" fill="#95A5A6" opacity="0.4" />
              <circle cx="8" cy="48" r="2.5" fill="#95A5A6" opacity="0.3" />
              <circle cx="5" cy="44" r="3" fill="#95A5A6" opacity="0.2" />
            </g>
          </svg>
        </div>
      </div>

      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium animate-pulse`}>
          {text}
        </p>
      )}

      <style>{`
        @keyframes truck-bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes wheel-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes smoke {
          0% {
            opacity: 0.4;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-10px) scale(1.5);
          }
        }

        @keyframes road-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-20px);
          }
        }

        .animate-truck-bounce {
          animation: truck-bounce 0.6s ease-in-out infinite;
        }

        .animate-wheel-spin {
          animation: wheel-spin 0.5s linear infinite;
        }

        .animate-smoke {
          animation: smoke 1s ease-out infinite;
        }

        .animate-road-scroll {
          animation: road-scroll 0.8s linear infinite;
          background: repeating-linear-gradient(
            to right,
            #cbd5e0 0px,
            #cbd5e0 10px,
            transparent 10px,
            transparent 20px
          );
        }
      `}</style>
    </div>
  );
}
