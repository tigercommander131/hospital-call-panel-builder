"use client";

/* Mouse-tracking perspective tilt — adapted from the 3D Card Effect
   pattern for physical objects (wall panels, cards). Spring-damped so
   the motion reads as weight, not bounce. */
import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export function Tilt({
  children,
  maxTilt = 6,
  liftZ = 12,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  /** Maximum tilt in degrees at the card edges. Keep small for realism. */
  maxTilt?: number;
  /** Forward translation on hover, in px. */
  liftZ?: number;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hovering = useMotionValue(0);

  const spring = { stiffness: 260, damping: 28, mass: 0.9 };
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), spring);
  const z = useSpring(useTransform(hovering, [0, 1], [0, liftZ]), spring);

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || e.pointerType === "touch") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
    hovering.set(1);
  };

  const onPointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
    hovering.set(0);
  };

  return (
    <div className={cn("[perspective:1100px]", className)}>
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={
          disabled
            ? undefined
            : { rotateX, rotateY, z, transformStyle: "preserve-3d" }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}
