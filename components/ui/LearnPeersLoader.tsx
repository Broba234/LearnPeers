'use client';

import React, { useEffect, useRef } from 'react';

/**
 * LearnPeersLoader
 *
 * Branded loading animation: a "peer network" builds itself on a canvas.
 * Nodes scatter across a disc, a signal radiates outward from the centre
 * node (Dijkstra-style spanning tree over nearest-neighbour edges), edges
 * grow with a travelling firing dot, nodes "pop" + glow on activation, then
 * the whole graph fades and rebuilds with a fresh random shape.
 *
 * Ported from the Claude Design source ("LearnPeers Loader.dc.html"), which
 * ran on the x-dc/DCLogic runtime. The drawing logic is preserved verbatim;
 * only the host (canvas + animation loop) is reimplemented for React, and the
 * layout constants are scaled by `size / 280` so it renders crisply at any
 * size. Honours `prefers-reduced-motion` by drawing a single settled frame.
 */

const BLUE: [number, number, number] = [14, 116, 184]; // #0E74B8
const DARK: [number, number, number] = [31, 42, 51]; //  #1F2A33

/** Radial background used in the source design — the full-screen variant. */
export const LEARN_PEERS_LOADER_BG =
  'radial-gradient(120% 120% at 50% 42%, #ffffff 0%, #f3f6f9 100%)';

export interface LearnPeersLoaderProps {
  /** Canvas display size in px (native design size is 280). Default 280. */
  size?: number;
  /** Animation speed multiplier (0.3–2.5 in the source). Default 1. */
  speed?: number;
  /** Number of peer nodes (5–16 in the source). Default 9. */
  nodeCount?: number;
  /** Optional caption rendered below the animation. */
  label?: string;
  /** Cover the viewport on the branded gradient background. */
  fullScreen?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
}

export default function LearnPeersLoader({
  size = 280,
  speed = 1,
  nodeCount = 9,
  label,
  fullScreen = false,
  className = '',
}: LearnPeersLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Latest props read inside the rAF loop without restarting the animation.
  const propsRef = useRef({ speed, nodeCount });
  propsRef.current = { speed, nodeCount };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = size;
    const cx = W / 2;
    const cy = W / 2;
    const k = W / 280; // scale layout constants tuned for the 280px design
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = W * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    // deterministic-ish RNG that reseeds each cycle for a new shape
    let seed = (Math.random() * 1e9) | 0;
    const rnd = () => {
      seed |= 0;
      seed = (seed + 0x9e3779b9) | 0;
      let t = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad);
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
      return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
    };

    interface Node {
      x: number;
      y: number;
      r: number;
      color: number[];
      activ: number;
      parent: number;
    }
    interface Edge {
      a: number;
      b: number;
      fire: number;
      arrive: number;
      cross: boolean;
    }
    interface Graph {
      nodes: Node[];
      edges: Edge[];
      buildDur: number;
      hold: number;
      fade: number;
      gap: number;
      total: number;
    }

    let graph: Graph;

    const build = () => {
      seed = (Math.random() * 1e9) | 0;
      const count = Math.max(5, Math.min(16, propsRef.current.nodeCount ?? 9));

      // scatter peers across a disc
      const nodes: Node[] = [];
      for (let i = 0; i < count; i++) {
        const ang = rnd() * Math.PI * 2;
        const R = (24 + Math.sqrt(rnd()) * 104) * k;
        nodes.push({
          x: cx + R * Math.cos(ang),
          y: cy + R * Math.sin(ang),
          r: (4 + rnd() * 5) * k,
          color: rnd() > 0.45 ? BLUE : DARK,
          activ: Infinity,
          parent: -1,
        });
      }

      // candidate edges: each node to its nearest few
      const cand: { a: number; b: number; d: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const near = nodes
          .map((n, j) => ({ j, d: Math.hypot(nodes[i].x - n.x, nodes[i].y - n.y) }))
          .filter((o) => o.j !== i)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3);
        for (const o of near) cand.push({ a: i, b: o.j, d: o.d });
      }

      // seed = node nearest the centre; signal radiates outward (Dijkstra)
      let seedIdx = 0;
      let best = Infinity;
      nodes.forEach((n, i) => {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d < best) {
          best = d;
          seedIdx = i;
        }
      });
      nodes[seedIdx].activ = 0;
      const adj: Record<number, { a: number; b: number; d: number }[]> = {};
      cand.forEach((e) => {
        (adj[e.a] = adj[e.a] || []).push(e);
        (adj[e.b] = adj[e.b] || []).push({ a: e.b, b: e.a, d: e.d });
      });
      const visited = new Set<number>();
      while (visited.size < nodes.length) {
        let u = -1;
        let ut = Infinity;
        nodes.forEach((n, i) => {
          if (!visited.has(i) && n.activ < ut) {
            ut = n.activ;
            u = i;
          }
        });
        if (u === -1) break;
        visited.add(u);
        for (const e of adj[u] || []) {
          const delay = 0.1 + (e.d / k) * 0.0016 + rnd() * 0.05;
          const nt = nodes[u].activ + delay;
          if (nt < nodes[e.b].activ) {
            nodes[e.b].activ = nt;
            nodes[e.b].parent = u;
          }
        }
      }
      // connect stragglers the proximity graph left unreached, so every peer fires
      let guard = 0;
      while (guard++ < count + 2) {
        let any = false;
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].activ !== Infinity) continue;
          let bestD = Infinity;
          let bj = -1;
          for (let j = 0; j < nodes.length; j++) {
            if (nodes[j].activ === Infinity) continue;
            const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            if (d < bestD) {
              bestD = d;
              bj = j;
            }
          }
          if (bj >= 0) {
            nodes[i].parent = bj;
            nodes[i].activ = nodes[bj].activ + 0.1 + (bestD / k) * 0.0016 + rnd() * 0.05;
            any = true;
          }
        }
        if (!any) break;
      }

      // build firing edges from the tree
      const edges: Edge[] = [];
      nodes.forEach((n, i) => {
        if (n.parent >= 0)
          edges.push({ a: n.parent, b: i, fire: nodes[n.parent].activ, arrive: n.activ, cross: false });
      });
      // a couple of sporadic cross-links for texture
      cand.sort((a, b) => a.d - b.d);
      let extra = 0;
      for (const e of cand) {
        if (extra >= 3) break;
        if (e.d > 80 * k) continue;
        if (nodes[e.b].parent === e.a || nodes[e.a].parent === e.b) continue;
        edges.push({
          a: e.a,
          b: e.b,
          fire: Math.max(nodes[e.a].activ, nodes[e.b].activ),
          arrive: Math.max(nodes[e.a].activ, nodes[e.b].activ) + 0.18,
          cross: true,
        });
        extra++;
      }

      const buildDur = Math.max(...nodes.map((n) => n.activ)) + 0.35;
      graph = { nodes, edges, buildDur, hold: 0.75, fade: 0.85, gap: 0.35, total: 0 };
      graph.total = graph.buildDur + graph.hold + graph.fade + graph.gap;
    };

    const draw = (t: number, now: number) => {
      const { nodes, edges, buildDur, hold, fade } = graph;
      // global fade-out envelope
      let env = 1;
      if (t > buildDur + hold) env = Math.max(0, 1 - (t - buildDur - hold) / fade);

      ctx.clearRect(0, 0, W, W);
      ctx.lineCap = 'round';

      // ---- edges: signal travels from source to target, then settles ----
      for (const e of edges) {
        const A = nodes[e.a];
        const B = nodes[e.b];
        if (t < e.fire) continue;
        const dur = Math.max(0.001, e.arrive - e.fire);
        const p = Math.min(1, (t - e.fire) / dur);
        const col = e.cross ? DARK : B.color;

        // growing connection line
        const ex = A.x + (B.x - A.x) * p;
        const ey = A.y + (B.y - A.y) * p;
        ctx.strokeStyle = rgba(col, (e.cross ? 0.28 : 0.5) * env);
        ctx.lineWidth = (e.cross ? 1.1 : 1.7) * k;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // the firing signal travelling along the synapse
        if (p < 1 && !e.cross) {
          const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, 9 * k);
          halo.addColorStop(0, rgba(col, 0.55 * env));
          halo.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(ex, ey, 9 * k, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba([255, 255, 255], 0.9 * env);
          ctx.beginPath();
          ctx.arc(ex, ey, 2.1 * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- nodes: pop "boom" on activation, then glow decays ----
      for (const n of nodes) {
        const a = t - n.activ;
        if (a < 0) continue;
        // pop scale with overshoot
        let scale: number;
        const t1 = 0.14;
        const t2 = 0.5;
        if (a < t1) scale = easeOut(a / t1) * 1.32;
        else if (a < t2) scale = 1.32 - 0.32 * easeOut((a - t1) / (t2 - t1));
        else scale = 1;
        // gentle breathing once settled
        if (a >= t2) scale = 1 + 0.05 * Math.sin((now / 1000) * 2 + n.x);

        const glow = Math.max(0, 1 - a / 0.55);
        const rr = n.r * scale;

        if (glow > 0.01) {
          const g = 14 * k * (0.6 + glow);
          const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, g);
          grd.addColorStop(0, rgba(n.color, 0.4 * glow * env));
          grd.addColorStop(1, rgba(n.color, 0));
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(n.x, n.y, g, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(n.color, env);
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
        ctx.fill();
        // bright core at the moment of firing
        if (a < 0.22) {
          ctx.fillStyle = rgba([255, 255, 255], (1 - a / 0.22) * 0.8 * env);
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    build();

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      // Draw a single fully-built, settled frame — no animation loop.
      draw(graph.buildDur + graph.hold * 0.5, performance.now());
      return;
    }

    let raf = 0;
    let cycleStart = performance.now();
    const frame = (now: number) => {
      const sp = propsRef.current.speed ?? 1;
      let t = ((now - cycleStart) / 1000) * sp;
      if (t >= graph.total) {
        build();
        cycleStart = now;
        t = 0;
      }
      draw(t, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, [size]);

  const wrapperClass = fullScreen
    ? `flex min-h-screen w-full flex-col items-center justify-center gap-5 ${className}`
    : `flex flex-col items-center justify-center gap-3 ${className}`;

  return (
    <div
      className={wrapperClass}
      style={fullScreen ? { background: LEARN_PEERS_LOADER_BG } : undefined}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {label ? <p className="text-sm text-slate-400">{label}</p> : null}
    </div>
  );
}
