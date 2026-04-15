import { useEffect, useRef } from "react";
import "./MapBackground.css";

const PIN_STOPS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

export default function MapBackground() {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const markerRef = useRef(null);
  const pinsRef = useRef([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const path = pathRef.current;
    if (!path || !markerRef.current) return;

    const pathLength = path.getTotalLength();
    const speed = 0.00018;
    let progress = 0;
    const startTime = performance.now();

    // Posicionar pines sobre el mismo recorrido usando getPointAtLength
    pinsRef.current.forEach((pin, index) => {
      if (!pin) return;
      const stop = PIN_STOPS[index] ?? 0;
      const point = path.getPointAtLength(pathLength * stop);

      const ring = pin.querySelector(".map-pin-ring");
      const center = pin.querySelector(".map-pin-dot");
      if (!ring || !center) return;

      ring.setAttribute("cx", point.x);
      ring.setAttribute("cy", point.y);
      center.setAttribute("cx", point.x);
      center.setAttribute("cy", point.y);

      pin.style.opacity = "0";
      pin.style.transform = "scale(0)";
    });

    const tick = (now) => {
      progress += speed;
      if (progress > 1) progress = 0;

      const distance = progress * pathLength;
      const point = path.getPointAtLength(distance);
      const lookAhead = path.getPointAtLength(Math.min(distance + 10, pathLength));
      const angle = (Math.atan2(lookAhead.y - point.y, lookAhead.x - point.x) * 180) / Math.PI;

      // El triangulo se define en 0..12, lo centramos para rotar sobre su eje
      markerRef.current.setAttribute(
        "transform",
        `translate(${point.x}, ${point.y}) rotate(${angle}) scale(1.8)`
      );

      pinsRef.current.forEach((pin, index) => {
        if (!pin || pin.dataset.visible === "true") return;
        const delayMs = index * 400;
        const stop = PIN_STOPS[index] ?? 0;
        if (now - startTime >= delayMs && progress >= stop) {
          pin.dataset.visible = "true";
        }
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="map-background"
      viewBox="0 0 1200 1200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <style>{`
          .map-path-main {
            fill: none;
            stroke: rgba(255,255,255,0.35);
            stroke-width: 4;
            stroke-dasharray: 10 10;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.25));
          }

          .map-pin {
            opacity: 0;
            transform: scale(0);
            transform-box: fill-box;
            transform-origin: center;
          }

          .map-pin[data-visible='true'] {
            opacity: 1;
            animation: pinPop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
              pinPulse 2.4s ease-in-out 0.8s infinite;
          }

          @keyframes pinPop {
            0% {
              opacity: 0;
              transform: scale(0);
            }
            65% {
              opacity: 1;
              transform: scale(1.2);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes pinPulse {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }

          .map-pin-dot {
            fill: #ffffff;
          }

          .map-pin-ring {
            fill: #ff3b3b;
            stroke: rgba(255, 255, 255, 0.95);
            stroke-width: 1.2;
            r: 6;
            filter: drop-shadow(0 0 6px rgba(255, 59, 59, 0.55));
          }

          .map-marker {
            filter: drop-shadow(0 0 12px #ff7a00);
          }

          .map-marker-shape {
            fill: #ff7a00;
          }
        `}</style>
      </defs>

      <path
        ref={pathRef}
        className="map-path-main"
        d="M 70 70 C 260 210, 420 20, 560 180 C 700 340, 860 120, 1050 260 C 1180 360, 1120 520, 930 610 C 760 700, 680 840, 820 1030 C 920 1160, 1040 1110, 1120 970 C 1190 850, 1120 730, 960 690 C 760 650, 590 760, 470 930 C 350 1100, 180 1140, 90 1000 C 20 890, 70 760, 230 700 C 420 620, 510 480, 410 330 C 320 190, 160 180, 90 330 C 40 450, 80 620, 230 760"
      />

      {PIN_STOPS.map((stop, index) => (
        <g
          key={`pin-${stop}`}
          ref={(el) => {
            pinsRef.current[index] = el;
          }}
          className="map-pin"
          data-visible="false"
          style={{ animationDelay: `${index * 0.4}s` }}
        >
          <circle className="map-pin-ring" cx="0" cy="0" r="6" />
          <circle className="map-pin-dot" cx="0" cy="0" r="3" />
        </g>
      ))}

      <g ref={markerRef} className="map-marker" transform="translate(70,70)">
        <polygon className="map-marker-shape" points="-10,-10 10,0 -10,10" />
      </g>
    </svg>
  );
}
