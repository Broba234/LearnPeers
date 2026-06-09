'use client';

import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { NodeConstellation } from './NodeDecor';

type Tone = 'brand' | 'light';

export type ParallaxItem = {
  /** position + size + opacity + blur + rotate utility classes */
  className: string;
  tone?: Tone;
  /** vertical travel in px across the scroll range (depth — bigger = closer/faster) */
  travel?: number;
};

type ScrollOffset = Parameters<typeof useScroll>[0] extends { offset?: infer O } ? O : never;

function Layer({ progress, item }: { progress: MotionValue<number>; item: ParallaxItem }) {
  const t = item.travel ?? 80;
  const y = useTransform(progress, [0, 1], [t, -t]);
  return (
    <motion.div style={{ y, willChange: 'transform' }} className="absolute inset-0">
      <NodeConstellation tone={item.tone ?? 'brand'} className={item.className} />
    </motion.div>
  );
}

/**
 * Layered, scroll-driven parallax field of logo-node constellations.
 * Transform-only (GPU-friendly), spring-smoothed, and disabled for users who
 * prefer reduced motion. Parent must be `relative`.
 */
export default function ParallaxNodes({
  items,
  offset = ['start end', 'end start'],
}: {
  items: ParallaxItem[];
  offset?: ScrollOffset;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const smooth = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 0.5 });

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item, i) =>
        reduce ? (
          <NodeConstellation key={i} tone={item.tone ?? 'brand'} className={item.className} />
        ) : (
          <Layer key={i} progress={smooth} item={item} />
        )
      )}
    </div>
  );
}
