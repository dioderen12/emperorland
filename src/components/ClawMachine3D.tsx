"use client";

import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { Float, Sparkles, ContactShadows } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { Rarity } from "@/lib/constants";

// Per-rarity lighting: brighter and warmer the higher the tier. The peek
// effect — players see the color and know what's coming before reveal.
const RARITY_COLORS: Record<
  Rarity,
  { emissive: string; light: string; rim: string; intensity: number }
> = {
  common:    { emissive: "#94a3b8", light: "#cbd5e1", rim: "#475569", intensity: 1.5 },
  uncommon:  { emissive: "#22c55e", light: "#86efac", rim: "#14532d", intensity: 2.0 },
  rare:      { emissive: "#0ea5e9", light: "#7dd3fc", rim: "#0c4a6e", intensity: 2.5 },
  epic:      { emissive: "#a855f7", light: "#c4b5fd", rim: "#581c87", intensity: 3.5 },
  legendary: { emissive: "#f59e0b", light: "#fde68a", rim: "#92400e", intensity: 5.0 },
};

type Stage = "idle" | "anticipation" | "shake" | "burst";

function Pack({
  rarity,
  stage,
  burstStartedAt,
}: {
  rarity: Rarity;
  stage: Stage;
  burstStartedAt: number | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const colors = RARITY_COLORS[rarity];

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    // Idle rotation — slow, hypnotic. Hand-rotation in Y plus subtle X wobble.
    groupRef.current.rotation.y += delta * 0.6;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;

    // Shake before burst — random jitter scaled by time. Builds tension.
    if (stage === "shake") {
      const intensity = 0.04;
      groupRef.current.position.x = (Math.random() - 0.5) * intensity;
      groupRef.current.position.z = (Math.random() - 0.5) * intensity;
    } else if (stage !== "burst") {
      // Spring back to center when not shaking
      groupRef.current.position.x *= 0.85;
      groupRef.current.position.z *= 0.85;
    }

    // Pulsing emissive glow during anticipation — heart-beat-like.
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (stage === "anticipation" || stage === "shake") {
      mat.emissiveIntensity = pulse * colors.intensity * 0.4;
    }

    // Burst — scale rapidly, fade, then disappears (parent unmounts the scene).
    if (stage === "burst" && burstStartedAt != null) {
      const t = (performance.now() - burstStartedAt) / 700; // 0..1 over BURST_MS
      const eased = Math.min(1, t);
      groupRef.current.scale.setScalar(1 + eased * 4);
      mat.opacity = Math.max(0, 1 - eased);
      mat.emissiveIntensity = colors.intensity * (1 + eased * 2);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={stage === "burst" ? 0 : 0.6}>
      <group ref={groupRef}>
        {/* Outer holographic box */}
        <mesh ref={meshRef} castShadow>
          <boxGeometry args={[1.3, 1.9, 0.35]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive={colors.emissive}
            emissiveIntensity={colors.intensity * 0.4}
            metalness={0.7}
            roughness={0.25}
            transparent
            opacity={1}
          />
        </mesh>
        {/* "?" face decal — small inner plane that floats just in front */}
        <mesh position={[0, 0, 0.18]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial color={colors.light} transparent opacity={0.85} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene({
  rarity,
  stage,
  burstStartedAt,
  onPackClick,
}: {
  rarity: Rarity;
  stage: Stage;
  burstStartedAt: number | null;
  onPackClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const colors = RARITY_COLORS[rarity];
  return (
    <>
      <ambientLight intensity={0.15} />
      {/* Key light, rarity-tinted, above-front */}
      <pointLight position={[0, 2.5, 3]} color={colors.light} intensity={colors.intensity * 8} distance={10} decay={2} />
      {/* Rim light from behind for separation */}
      <pointLight position={[-2, 0, -3]} color={colors.rim} intensity={colors.intensity * 4} distance={8} decay={2} />
      {/* Cool fill from below for that "stage" feel */}
      <pointLight position={[0, -2, 1]} color="#1e293b" intensity={2} distance={6} />

      <group onClick={onPackClick}>
        <Pack rarity={rarity} stage={stage} burstStartedAt={burstStartedAt} />
      </group>

      {/* Sparkle particles scaling with rarity — legendary gets a halo of them */}
      <Sparkles
        count={
          rarity === "legendary" ? 120 :
          rarity === "epic" ? 60 :
          rarity === "rare" ? 30 :
          rarity === "uncommon" ? 22 :
          15
        }
        scale={[5, 5, 5]}
        size={rarity === "legendary" ? 4 : 2.5}
        speed={0.4}
        color={colors.light}
      />

      {/* Floor shadow so the pack feels anchored, not floating in the void */}
      <ContactShadows
        position={[0, -1.4, 0]}
        opacity={0.6}
        scale={6}
        blur={2.5}
        far={2}
        color={colors.emissive}
      />
    </>
  );
}

export function ClawMachine3D({
  rarity,
  stage,
  onPackClick,
}: {
  rarity: Rarity;
  stage: Stage;
  onPackClick: () => void;
}) {
  // Capture burst start time once when stage transitions to "burst" so the
  // animation duration is deterministic (not tied to component mount time).
  const burstStartedAt = useRef<number | null>(null);
  useEffect(() => {
    if (stage === "burst") {
      burstStartedAt.current = performance.now();
    } else {
      burstStartedAt.current = null;
    }
  }, [stage]);

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene
        rarity={rarity}
        stage={stage}
        burstStartedAt={burstStartedAt.current}
        onPackClick={() => onPackClick()}
      />
    </Canvas>
  );
}
