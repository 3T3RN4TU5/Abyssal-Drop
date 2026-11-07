import React from 'react';

export interface InkSplatEvent {
  id: number;
  angleRad: number; // 0 = front/top, PI/2 = right, PI = behind/bottom, -PI/2 = left
  intensity: number; // 0.2 .. 1.0
  type: 'gunfire' | 'footstep' | 'breach';
  ageSec: number;
  maxAgeSec: number;
}

interface InkThreatOverlayProps {
  splats: InkSplatEvent[];
  lowHpRatio: number; // 0..1
  weatherId: 'CLEAR' | 'DENSE_FOG' | 'TORRENTIAL_RAIN' | 'EM_SQUALL';
}

/**
 * Gritty, dark Ink-and-Splash Threat Indicator HUD.
 * Visualizes incoming gunfire and weather-modulated acoustic footsteps as spreading sumi-e ink splatters
 * around the peripheral ring while keeping the central >= 85% viewport unobstructed.
 */
export const InkThreatOverlay: React.FC<InkThreatOverlayProps> = ({
  splats,
  lowHpRatio,
  weatherId,
}) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="inkVignette" cx="50%" cy="50%" r="55%">
            <stop offset="68%" stopColor="#040609" stopOpacity="0" />
            <stop
              offset="94%"
              stopColor={lowHpRatio < 0.35 ? '#450a0a' : '#05080f'}
              stopOpacity={lowHpRatio < 0.35 ? '0.62' : '0.45'}
            />
            <stop
              offset="100%"
              stopColor={lowHpRatio < 0.35 ? '#7f1d1d' : '#020408'}
              stopOpacity={lowHpRatio < 0.35 ? '0.88' : '0.78'}
            />
          </radialGradient>
        </defs>

        {/* Subtle peripheral ink frame */}
        <rect x="0" y="0" width="1000" height="1000" fill="url(#inkVignette)" />

        {/* Corner sumi-e brush frame accents */}
        <path
          d="M 18 75 L 18 22 L 85 22 L 72 28 L 26 28 L 24 68 Z"
          fill="rgba(148, 163, 184, 0.25)"
        />
        <path
          d="M 982 75 L 982 22 L 915 22 L 928 28 L 974 28 L 976 68 Z"
          fill="rgba(148, 163, 184, 0.25)"
        />
        <path
          d="M 18 925 L 18 978 L 85 978 L 72 972 L 26 972 L 24 932 Z"
          fill="rgba(148, 163, 184, 0.25)"
        />
        <path
          d="M 982 925 L 982 978 L 915 978 L 928 972 L 974 972 L 976 932 Z"
          fill="rgba(148, 163, 184, 0.25)"
        />

        {/* Dynamic directional ink-and-splash threat splatters */}
        <g transform="translate(500, 500)">
          {splats.map((splat) => {
            const lifeProgress = Math.min(1, splat.ageSec / splat.maxAgeSec);
            const alpha = Math.max(0, (1 - lifeProgress) * (0.45 + splat.intensity * 0.5));
            const spreadScale = 0.8 + lifeProgress * 0.55 * splat.intensity;
            const deg = (splat.angleRad * 180) / Math.PI;
            const radius = 375;

            const fillPrimary =
              splat.type === 'gunfire'
                ? `rgba(220, 38, 38, ${alpha.toFixed(2)})`
                : splat.type === 'breach'
                ? `rgba(6, 182, 212, ${alpha.toFixed(2)})`
                : `rgba(245, 158, 11, ${(alpha * 0.85).toFixed(2)})`;

            const fillInkCore = `rgba(9, 11, 16, ${(alpha * 0.92).toFixed(2)})`;

            return (
              <g
                key={splat.id}
                transform={`rotate(${deg.toFixed(1)}) translate(0, -${radius}) scale(${spreadScale.toFixed(2)})`}
              >
                {/* Dark sumi-e ink backing splash */}
                <path
                  d="M -68 18 C -45 -22, -18 -38, 0 -46 C 22 -38, 48 -18, 68 18 C 42 8, 20 14, 0 26 C -22 14, -44 8, -68 18 Z"
                  fill={fillInkCore}
                />
                {/* High-contrast threat ink core */}
                <path
                  d="M -48 12 C -30 -14, -12 -28, 0 -35 C 14 -28, 32 -14, 48 12 C 26 4, 12 8, 0 18 C -12 8, -28 4, -48 12 Z"
                  fill={fillPrimary}
                />
                {/* Ink droplets */}
                <circle cx="-56" cy="-12" r="5.5" fill={fillPrimary} />
                <circle cx="54" cy="-14" r="4.5" fill={fillPrimary} />
                <circle cx="0" cy="-54" r="6.5" fill={fillPrimary} />
                <circle cx="-26" cy="-42" r="3.8" fill={fillInkCore} />
                <circle cx="29" cy="-40" r="4.2" fill={fillInkCore} />
              </g>
            );
          })}
        </g>

        {/* Weather atmospheric edge streak cue */}
        {weatherId === 'TORRENTIAL_RAIN' && (
          <g stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1.5">
            <line x1="80" y1="40" x2="60" y2="130" />
            <line x1="920" y1="60" x2="900" y2="150" />
            <line x1="140" y1="840" x2="120" y2="930" />
            <line x1="880" y1="820" x2="860" y2="910" />
          </g>
        )}
      </svg>
    </div>
  );
};
