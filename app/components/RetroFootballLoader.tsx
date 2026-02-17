"use client";

import { useEffect, useMemo, useState } from "react";

interface RetroFootballLoaderProps {
  className?: string;
}

const FRAME_SEQUENCE = [
  ...Array.from({ length: 24 }, (_, i) => i),
  24,
  24,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
];
const TOTAL_FRAMES = FRAME_SEQUENCE.length;
const FRAME_MS = 110;

export default function RetroFootballLoader({ className = "" }: RetroFootballLoaderProps) {
  const [frame, setFrame] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setFrame((value) => (value + 1) % TOTAL_FRAMES);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const scene = useMemo(() => {
    const phaseFrame = reducedMotion ? 0 : FRAME_SEQUENCE[frame];
    const throwPhase = phaseFrame < 6 ? 0 : phaseFrame < 12 ? 1 : 2;
    const ballInFlight = phaseFrame >= 12 && phaseFrame < 24;
    const catchPhase = phaseFrame >= 24 && phaseFrame < 30;
    const catchFlash = phaseFrame === 24;
    const postCatchHold = phaseFrame >= 30;
    const flightStep = ballInFlight ? phaseFrame - 12 : 0;

    const qbArmOffsetY = throwPhase === 0 ? -1 : throwPhase === 1 ? -4 : -2;
    const qbArmOffsetX = throwPhase === 1 ? 2 : throwPhase === 2 ? 1 : 0;
    const wrReach = catchPhase ? -2 : 0;
    const wrRecoil = catchPhase ? Math.min(3, phaseFrame - 24) : postCatchHold ? 1 : 0;

    const ballX = ballInFlight ? 68 + flightStep * 10 : catchPhase || postCatchHold ? 182 : 65;
    const arcPeak = ballInFlight ? Math.sin((flightStep / 11) * Math.PI) : 0;
    const ballY = ballInFlight ? Math.round(34 - arcPeak * 12) : catchPhase || postCatchHold ? 28 : 33;
    const cameraJitterX = phaseFrame % 6 === 0 ? -1 : phaseFrame % 5 === 0 ? 1 : 0;
    const cameraJitterY = phaseFrame % 7 === 0 ? 1 : 0;

    return {
      qbArmOffsetX,
      qbArmOffsetY,
      wrReach,
      wrRecoil,
      ballInFlight,
      catchPhase,
      postCatchHold,
      catchFlash,
      ballX,
      ballY,
      flightStep,
      cameraJitterX,
      cameraJitterY,
    };
  }, [frame, reducedMotion]);

  const neon = "#00d4ff";
  const neonDark = "#0891b2";
  const fieldLine = "#164151";
  const spriteScale = 1.55;

  const getBallPosition = (step: number) => {
    if (step < 0) return null;
    const x = 68 + step * 10;
    const arcPeak = Math.sin((step / 11) * Math.PI);
    const y = Math.round(34 - arcPeak * 12);
    return { x, y };
  };
  const ghostBallOne = scene.ballInFlight ? getBallPosition(scene.flightStep - 1) : null;
  const ghostBallTwo = scene.ballInFlight ? getBallPosition(scene.flightStep - 2) : null;

  return (
    <div
      className={[
        "relative w-full h-14 overflow-hidden",
        className,
      ].join(" ")}
      aria-label="Retro football loading animation"
    >
      <svg
        viewBox="0 0 240 64"
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-hidden="true"
        className="h-full w-auto pixelated"
        style={{ imageRendering: "pixelated", shapeRendering: "crispEdges" }}
      >
        <rect x="0" y="0" width="240" height="64" fill="rgba(4,12,18,0.45)" />
        <rect x="0" y="54" width="240" height="2" fill={fieldLine} />
        <g fill="#123846">
          <rect x="24" y="55" width="2" height="5" />
          <rect x="72" y="55" width="2" height="5" />
          <rect x="120" y="55" width="2" height="5" />
          <rect x="168" y="55" width="2" height="5" />
          <rect x="216" y="55" width="2" height="5" />
        </g>

        <g transform={`translate(${scene.cameraJitterX} ${scene.cameraJitterY})`}>
        <g transform={`translate(12 10) scale(${spriteScale})`}>
          <rect x="0" y="14" width="14" height="10" fill={neon} />
          <rect x="2" y="8" width="10" height="8" fill={neon} />
          <rect x="4" y="4" width="6" height="4" fill={neon} />
          <rect x="2" y="24" width="4" height="6" fill={neonDark} />
          <rect x="8" y="24" width="4" height="6" fill={neonDark} />
          <rect x={11 + scene.qbArmOffsetX} y={12 + scene.qbArmOffsetY} width="5" height="3" fill={neonDark} />
        </g>

        <g transform={`translate(${164 + scene.wrRecoil} 10) scale(${spriteScale})`}>
          <rect x="0" y="14" width="14" height="10" fill={neon} />
          <rect x="2" y="8" width="10" height="8" fill={neon} />
          <rect x="4" y="4" width="6" height="4" fill={neon} />
          <rect x="2" y="24" width="4" height="6" fill={neonDark} />
          <rect x="8" y="24" width="4" height="6" fill={neonDark} />
          <rect x={-4 + scene.wrReach} y="13" width="5" height="3" fill={neonDark} />
        </g>

        {(scene.ballInFlight || scene.catchPhase || scene.postCatchHold) && (
          <g transform={`translate(${scene.ballX} ${scene.ballY})`}>
            <rect x="0" y="0" width="6" height="3" fill="#d5a76e" />
            <rect x="2" y="0" width="2" height="3" fill="#7c5130" />
          </g>
        )}
        {scene.ballInFlight && (
          <>
            {ghostBallOne && (
              <g
                transform={`translate(${ghostBallOne.x} ${ghostBallOne.y})`}
                opacity="0.35"
              >
                <rect x="0" y="0" width="6" height="3" fill="#9f8b6f" />
              </g>
            )}
            {ghostBallTwo && (
              <g
                transform={`translate(${ghostBallTwo.x} ${ghostBallTwo.y})`}
                opacity="0.2"
              >
                <rect x="0" y="0" width="6" height="3" fill="#7c7162" />
              </g>
            )}
          </>
        )}

        {scene.catchFlash && (
          <g opacity="0.55">
            <rect x="186" y="22" width="12" height="12" fill="#67e8f9" />
          </g>
        )}
        </g>
      </svg>
    </div>
  );
}
