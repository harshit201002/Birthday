import { Component, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box3, DoubleSide, Euler, Group, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Vector2, Vector3 } from 'three';
import { bloomWeights, createFlowerStem, createPetalGeometry } from './flowerGeometry.js';

const ENTRANCE_DURATION = 4.6;

const fallback = (
  <p className="sr-only">
    A garden of white and blush pink tulips and white lilies surrounds the birthday greeting.
    The 3D flowers are unavailable on this device.
  </p>
);

class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? fallback : this.props.children;
  }
}

// Shared vertex buffers stay unchanged; each plant supplies a few wind uniforms.
function createBreezeStem(stem, uniforms) {
  const object = stem.clone(true);
  const materials = new Map();
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (!materials.has(mesh.material)) {
      const material = mesh.material.clone();
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader.replace("#include <common>", `
          #include <common>
          attribute vec3 leafAnchor;
          attribute vec2 leafFlex;
          uniform vec2 breezeBend;
          uniform vec2 leafFollow;
          uniform float breezeHeight, breezeTime, breezePhase, breezeStrength;
          mat3 leafRotation() {
            if (leafFlex.x == 0.0) return mat3(1.0);
            float tilt = sin(breezeTime * 0.78 + breezePhase + leafFlex.y - 0.7)
              * 0.024 * breezeStrength;
            float twist = sin(breezeTime * 1.01 + breezePhase * 1.3 + leafFlex.y)
              * 0.014 * breezeStrength;
            // Flexible tips trail their attachment; different leaves recover at different rates.
            float response = 0.7 + 0.3 * sin(leafFlex.y + 1.2);
            tilt = (tilt + leafFollow.x * response) * leafFlex.x;
            twist = (twist + leafFollow.y * response) * leafFlex.x;
            float c = cos(tilt), s = sin(tilt), ct = cos(twist), st = sin(twist);
            return mat3(ct, 0.0, -st, 0.0, 1.0, 0.0, st, 0.0, ct)
              * mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
          }
        `).replace("void main() {", "void main() { mat3 foliageRotation = leafRotation();")
          .replace("#include <beginnormal_vertex>", `
            #include <beginnormal_vertex>
            objectNormal = foliageRotation * objectNormal;
            float slope = 2.0 * clamp(position.y / breezeHeight, 0.0, 1.0) / breezeHeight;
            objectNormal.y -= slope * dot(breezeBend, objectNormal.xz);
          `).replace("#include <begin_vertex>", `
            #include <begin_vertex>
            transformed = leafAnchor + foliageRotation * (transformed - leafAnchor);
            float heightRatio = clamp(transformed.y / breezeHeight, 0.0, 1.0);
            float bend = heightRatio * heightRatio
              + max(transformed.y - breezeHeight, 0.0) * 2.0 / breezeHeight;
            transformed.xz += breezeBend * bend;
          `);
      };
      material.customProgramCacheKey = () => 'stem-breeze-v2';
      materials.set(mesh.material, material);
    }
    mesh.material = materials.get(mesh.material);
  });
  return object;
}

function Flower({ model, motion, reducedMotion, phase, speed, depth, ...props }) {
  const movement = useRef(null);
  const height = model.species === 'lily' ? 0.52 : 0.415;
  const headPivot = useRef(null);
  const follow = useRef({ headX: 0, headZ: 0 });
  const wind = useMemo(() => ({
    breezeBend: { value: new Vector2() }, breezeHeight: { value: height },
    breezeTime: { value: 0 }, breezePhase: { value: phase }, breezeStrength: { value: 0 },
    leafFollow: { value: new Vector2() },
  }), [height, phase]);
  const object = useMemo(() => createBreezeStem(model.stem, wind), [model.stem, wind]);
  useEffect(() => () => {
    const materials = new Set();
    object.traverse((mesh) => { if (mesh.isMesh) materials.add(mesh.material); });
    materials.forEach((material) => material.dispose());
  }, [object]);
  const petals = useRef(null);
  const previousBloom = useRef(-1);
  const petalPose = useMemo(() => new Mesh(model.petal, model.material), [model]);

  useEffect(() => {
    const head = petals.current;
    previousBloom.current = -1;
    for (let index = 0; index < 6; index++) {
      head.setMatrixAt(index, new Matrix4().makeRotationY(index * Math.PI / 3)
        .scale(new Vector3(index % 2 ? 0.9 : 1, index % 2 ? 0.96 : 1, index % 2 ? 0.9 : 1)));
      head.setMorphAt(index, petalPose);
    }
    head.instanceMatrix.needsUpdate = true;
    head.morphTexture.needsUpdate = true;
  }, [petalPose]);

  useFrame((_, delta) => {
    const group = movement.current;
    if (!group) return;

    const current = motion.current;
    const variation = (Math.sin(phase * 1.731 + 4.2) + 1) / 2;
    const layerDelay = props.position[2] >= 0 ? 0.15 : props.position[2] > -4 ? 0.55 : 1;
    const entranceBloom = MathUtils.smootherstep(
      (current.entranceElapsed - layerDelay - variation * 0.3) / (2.65 + variation * 0.35), 0, 1,
    );
    const progress = reducedMotion || current.entranceDone ? 1 : 0.32 + 0.68 * entranceBloom;
    const delay = variation * 0.18;
    const flowerBloom = MathUtils.clamp((progress - delay) / (1 - delay), 0, 1);
    if (flowerBloom !== previousBloom.current && (flowerBloom === 0 || flowerBloom === 1
      || Math.abs(flowerBloom - previousBloom.current) > 0.00001)) {
      for (let index = 0; index < 6; index++) {
        // The inner triplet follows the outer petals, with small individual variations.
        const stagger = (index % 2 ? 0.045 : 0) + index * 0.006
          + (Math.sin(phase + index * 1.7) + 1) * 0.008;
        const unfolding = MathUtils.clamp((flowerBloom - stagger) / (1 - stagger), 0, 1);
        const weights = bloomWeights(unfolding ** (1 + (index % 3) * 0.035));
        weights.forEach((weight, target) => { petalPose.morphTargetInfluences[target] = weight; });
        petals.current.setMorphAt(index, petalPose);
      }
      petals.current.morphTexture.needsUpdate = true;
      previousBloom.current = flowerBloom;
    }

    const awakening = reducedMotion ? 0 : current.entranceDone ? 1
      : MathUtils.smootherstep(flowerBloom, 0.45, 1);
    const layerStrength = MathUtils.clamp(0.45 + depth * 0.5, 0.5, 1);
    const strength = awakening * layerStrength * (0.72 + variation * 0.28);
    const { time, x, y } = current;
    // The shared gust travels across x/depth; each stem also responds at its own pace.
    const gust = Math.sin(time * 0.57 - props.position[0] * 0.45 - props.position[2] * 0.16);
    const amplitude = (model.species === 'lily' ? 0.0065 : 0.006) * strength * current.windIntensity;
    const bendX = amplitude * (gust * 0.65 + Math.sin(time * (0.68 + speed) + phase) * 0.35);
    const bendZ = amplitude * 0.45 * (Math.sin(time * 0.43 - props.position[0] * 0.32 + phase * 0.2) * 0.65
      + Math.cos(time * (0.56 + speed) + phase) * 0.35);
    wind.breezeBend.value.set(bendX, bendZ);
    wind.breezeTime.value = time;
    wind.breezeStrength.value = strength * current.windIntensity * (0.55 + (gust + 1) * 0.225);
    const slopeX = Math.atan2(2 * bendZ, height);
    const slopeZ = -Math.atan2(2 * bendX, height);
    // Time-based damping keeps follow-through stable at different frame rates.
    // Heads stay attached to the stem while their tilt lags; leaves trail a little longer.
    const step = Math.min(delta, 0.05);
    const headBlend = 1 - Math.exp(-(3.5 + variation) * step);
    const leafBlend = 1 - Math.exp(-(2.1 + variation * 0.8) * step);
    const response = follow.current;
    response.headX = reducedMotion ? 0 : MathUtils.lerp(response.headX, slopeX, headBlend);
    response.headZ = reducedMotion ? 0 : MathUtils.lerp(response.headZ, slopeZ, headBlend);
    const leaves = wind.leafFollow.value;
    if (reducedMotion) leaves.set(0, 0);
    else leaves.set(MathUtils.lerp(leaves.x, slopeZ * 0.65, leafBlend),
      MathUtils.lerp(leaves.y, slopeX * 0.65, leafBlend));
    headPivot.current.position.set(bendX, height, bendZ);
    headPivot.current.rotation.set(response.headX
      + Math.sin(time * (0.63 + speed) + phase - 0.4) * 0.004 * strength, 0,
      response.headZ + Math.sin(time * (0.71 + speed) + phase - 0.65) * 0.004 * strength);
    // Only pointer parallax stays on the outer group; wind bends the actual stem.
    group.rotation.set(reducedMotion ? 0 : y * 0.008, reducedMotion ? 0 : x * 0.012 * depth,
      reducedMotion ? 0 : -x * 0.006);
    group.position.set(reducedMotion ? 0 : x * 0.003 * depth, reducedMotion ? 0 : y * 0.002, 0);

  });

  return (
    <group {...props}>
      <group ref={movement}>
        <primitive object={object} dispose={null} />
        <group ref={headPivot} position={[0, height, 0]}>
          <instancedMesh ref={petals} args={[model.petal, model.material, 6]} frustumCulled={false} />
        </group>
      </group>
    </group>
  );
}

function Arrangement({ motion, reducedMotion, animate, onReady }) {
  const { viewport, gl, scene, camera, invalidate } = useThree();
  const garden = useRef(null);
  const driftField = useRef(null);
  const lastDriftUpdate = useRef(0);
  useEffect(() => {
    if (!animate) return;
    let frame;
    let previous = performance.now();
    const interval = 1000 / 60;
    const tick = (now) => {
      const elapsed = now - previous;
      if (elapsed >= interval) {
        invalidate();
        previous = now - elapsed % interval;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, invalidate]);
  useEffect(() => {
    const field = gl.domElement.closest('.hero-garden').querySelector('.hero-petals');
    driftField.current = field;
    return () => {
      field?.style.removeProperty('--breeze-drift');
      field?.style.removeProperty('--breeze-lift');
      field?.style.removeProperty('--breeze-turn');
    };
  }, [gl]);
  const models = useMemo(() => {
    const stems = { tulip: createFlowerStem('tulip'), lily: createFlowerStem('lily') };
    const petals = { tulip: createPetalGeometry('tulip'), lily: createPetalGeometry('lily') };
    const regular = [['tulip', '#FFFEFA'], ['tulip', '#F3DADD'], ['lily', '#FFFEFA']].map(([species, color]) => {
      const stem = stems[species];
      const petal = petals[species];
      const headBounds = petal.boundingBox.clone().translate(new Vector3(0, species === 'lily' ? 0.52 : 0.415, 0));
      // The head opens radially, so reserve its maximum extent in every direction.
      const radius = Math.max(Math.abs(headBounds.min.z), Math.abs(headBounds.max.z));
      headBounds.min.x = headBounds.min.z = -radius;
      headBounds.max.x = headBounds.max.z = radius;
      const material = new MeshPhysicalMaterial({ color, vertexColors: true, side: DoubleSide,
          roughness: 0.78, metalness: 0, clearcoat: 0, sheen: 0.55, sheenColor: '#FFFEFA',
          sheenRoughness: 0.9, specularIntensity: 0.18, emissive: color, emissiveIntensity: 0.16 });
      // A little diffuse backlighting suggests thin petal translucency without
      // a fullscreen transmission/refraction pass or extra texture assets.
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          #if NUM_DIR_LIGHTS > 0
            float petalBacklight = pow(max(dot(-normal, directionalLights[0].direction), 0.0), 2.0);
            reflectedLight.indirectDiffuse += diffuseColor.rgb * directionalLights[0].color
              * (0.09 + petalBacklight * 0.24);
          #endif
        `);
      };
      material.customProgramCacheKey = () => 'soft-petal-backlight-v1';
      return { species, stem, petal, material, bounds: new Box3().setFromObject(stem).union(headBounds) };
    });
    // Faint botanical layers reuse the same stems and animated petal geometry.
    const background = regular.map((model) => {
      const material = new MeshBasicMaterial({ color: '#E8C4B8', side: DoubleSide,
        transparent: true, opacity: 0.025, depthWrite: false, fog: false,
        forceSinglePass: true });
      const stem = model.stem.clone(true);
      stem.traverse((object) => { if (object.isMesh) object.material = material; });
      return { ...model, stem, material };
    });
    return [...regular, ...background];
  }, []);
  // Match the Hero's CSS breakpoints, including when a scrollbar narrows the canvas.
  const compact = !window.matchMedia('(min-width: 1100px) and (min-aspect-ratio: 6/5)').matches;
  const mobile = window.matchMedia('(max-width: 639px)').matches;
  const flowers = useMemo(() => {
    const result = [];
    const stage = gl.domElement.closest('.hero-garden');
    const stageRect = stage.getBoundingClientRect();
    const protectedRects = [];
    for (const element of stage.querySelectorAll('.hero-reading h1, .hero-reading h1 span, .hero-reading h2, .hero-reading p, .hero-reading dt, .hero-reading dd, .hero-reading button, .hero-garden-scroll')) {
      for (const node of element.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) protectedRects.push({
          left: rect.left - stageRect.left - 16, right: rect.right - stageRect.left + 16,
          top: rect.top - stageRect.top - 16, bottom: rect.bottom - stageRect.top + 16,
        });
      }
    }
    const add = (x, y, height, z, index, depth, background = false, lean = 0) => {
      const model = models[index % 3 + (background ? 3 : 0)];
      let scale = height / (model.bounds.max.y - model.bounds.min.y);
      const rotation = [0.42 + Math.sin(index * 1.7) * 0.2 + (random(index + 310) - 0.5) * 0.06,
        Math.sin(index * 2.3) * 0.8, Math.sin(index * 1.3) * 0.13 + lean];
      const margin = (mobile ? 12 : 18) / (stage.clientWidth / viewport.width);
      const clamp = (value, extent, min, max) => Math.max(-extent / 2 + margin - min,
        Math.min(extent / 2 - margin - max, value));
      // Reserve the full unfolded shape, including a small margin for the breeze.
      for (let attempt = 0; attempt < 20; attempt++) {
        const transform = new Matrix4().makeRotationFromEuler(new Euler(...rotation))
          .scale(new Vector3(scale, scale, scale));
        const bounds = model.bounds.clone().expandByScalar(0.017).applyMatrix4(transform);
        const px = clamp(x, viewport.width, bounds.min.x, bounds.max.x);
        const py = clamp(y, viewport.height, bounds.min.y, bounds.max.y);
        const pixels = stage.clientWidth / viewport.width;
        const rect = {
          left: (px + bounds.min.x + viewport.width / 2) * pixels,
          right: (px + bounds.max.x + viewport.width / 2) * pixels,
          top: (viewport.height / 2 - py - bounds.max.y) * pixels,
          bottom: (viewport.height / 2 - py - bounds.min.y) * pixels,
        };
        if (!background && protectedRects.some((text) => rect.left < text.right && rect.right > text.left
          && rect.top < text.bottom && rect.bottom > text.top)) {
          scale *= 0.9;
          continue;
        }
        result.push({ position: [px, py, z + random(index + 330) * 0.32], scale, rotation, model,
          phase: index * 2.399, speed: 0.23 + random(index + 340) * 0.11,
          depth: depth * (0.9 + random(index + 350) * 0.2) });
        break;
      }
    };
    // Overlapping bouquets at three depths, with a clear central reading area.
    const random = (i) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
    if (compact) {
      const reading = stage.querySelector('.hero-reading');
      const indicator = stage.querySelector('.hero-garden-scroll');
      const crownLimit = Math.max(0.2, (reading.offsetTop - 36) / 100);
      const meadowLimit = Math.max(0.35, (stage.offsetHeight - indicator.offsetTop - indicator.offsetHeight - 18) / 100);
      const crownCount = mobile ? 4 : 6;
      const meadowCount = mobile ? 14 : 20;
      for (let i = 0; i < crownCount; i++) {
        const side = i < crownCount / 2 ? -1 : 1;
        const x = side * viewport.width * (0.27 + random(i + 1) * 0.16);
        const height = Math.min(crownLimit, mobile ? 1.18 : 1.9) * (0.75 + random(i + 10) * 0.25);
        add(x, viewport.height / 2 - height - 0.12 + random(i + 15) * 0.2, height,
          -3 + (i % 3) * 1.7, i, 0.4 + (i % 3) * 0.3, false, side * 0.45);
      }
      for (let i = 0; i < meadowCount; i++) {
        const row = i % 2;
        const x = ((Math.floor(i / 2) + 0.1 + random(i + 80) * 0.8) / (meadowCount / 2) - 0.5) * viewport.width * 0.96;
        const height = meadowLimit * (0.62 + random(i + 50) * 0.35);
        add(x, -viewport.height / 2 + 0.12 + row * 0.08,
          height, -3 + row * 3, i + crownCount, 0.6 + row * 0.6);
      }
      for (const side of [-1, 1]) {
        add(side * viewport.width * 0.46, -viewport.height * 0.32,
          viewport.height * 0.56, -6, result.length, 0.3, true);
      }
    } else {
      // Broad bouquets step inward and down toward the continuous meadow.
      for (const side of [-1, 1]) {
        for (let i = 0; i < 8; i++) {
          const seed = i + (side < 0 ? 0 : 47);
          const spread = random(seed + 10);
          const height = viewport.height * (0.33 + spread * 0.27 + random(seed + 40) * 0.12);
          add(side * viewport.width * (0.29 + spread * 0.17),
            -viewport.height * 0.48 + random(seed + 100) * 0.16,
            height, -3.5 + (i % 3) * 2, result.length, 0.4 + (i % 3) * 0.4);
        }
        for (let i = 0; i < 4; i++) {
          add(side * viewport.width * (0.19 + random(i + 70) * 0.15),
            -viewport.height * 0.48 + random(i + 90) * 0.14,
            viewport.height * (0.22 + random(i + 60) * 0.16),
            -2.8 + (i % 2) * 1.6, result.length, 0.65);
        }
        for (let i = 0; i < 3; i++) {
          add(side * viewport.width * (0.24 + i * 0.075), -viewport.height * 0.46,
            viewport.height * (0.77 + random(i + 120) * 0.15),
            -6.5, result.length, 0.2, true);
        }
      }
      // Jittered coverage across two depths prevents gaps without making a straight row.
      for (let i = 0; i < 26; i++) {
        const row = i % 2;
        const x = ((Math.floor(i / 2) + 0.1 + random(i + 160) * 0.8) / 13 - 0.5) * viewport.width * 0.96;
        const edge = Math.abs(x) / viewport.width;
        const height = viewport.height * (0.12 + random(i + 210) * 0.07 + edge * 0.25);
        add(x, -viewport.height / 2 + 0.12 + random(i + 230) * 0.09,
          height, -2.5 + row * 3, result.length, 0.65 + row * 0.6);
      }
    }
    return result;
  }, [viewport.width, viewport.height, compact, mobile, models, gl]);

  useEffect(() => {
    let active = true;
    const finish = () => { if (active) onReady(true); };
    // Warm shader programs before the first draw, using parallel compilation
    // where supported. On failure, keep the normal render/boundary fallback.
    gl.compileAsync(scene, camera).then(finish, finish);
    return () => { active = false; };
  }, [gl, scene, camera, onReady]);
  useEffect(() => () => {
    const geometries = new Set();
    models.forEach(({ stem, petal, material }) => {
      stem.traverse((object) => { if (object.isMesh) {
        geometries.add(object.geometry); object.material.dispose();
      } });
      geometries.add(petal);
      material.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
  }, [models]);

  useFrame((_, delta) => {
    const current = motion.current;
    if (reducedMotion) {
      current.x = current.y = current.targetX = current.targetY = 0;
      current.entranceDone = true;
      current.windIntensity = 0;
      driftField.current?.style.setProperty('--breeze-drift', '0px');
      driftField.current?.style.setProperty('--breeze-lift', '0px');
      driftField.current?.style.setProperty('--breeze-turn', '0deg');
      garden.current.position.set(0, 0, 0);
      return;
    }
    const step = Math.min(delta, 0.05);
    current.time += step;
    // Slow, overlapping gust envelopes avoid a constant metronomic breeze.
    const gustEnvelope = MathUtils.smootherstep(
      Math.sin(current.time * 0.19) * 0.65 + Math.sin(current.time * 0.31 + 1.8) * 0.35, -0.4, 0.85,
    );
    current.windIntensity = 0.58 + gustEnvelope * 0.42;
    // Extend the existing CSS petal field, at most 30 times/sec, without another animation loop.
    if (driftField.current && current.time - lastDriftUpdate.current >= 1 / 30) {
      const drift = Math.sin(current.time * 0.57) * current.windIntensity;
      driftField.current.style.setProperty('--breeze-drift', (drift * 18).toFixed(2) + 'px');
      driftField.current.style.setProperty('--breeze-lift', (Math.sin(current.time * 0.43) * current.windIntensity * 5).toFixed(2) + 'px');
      driftField.current.style.setProperty('--breeze-turn', (drift * 8).toFixed(2) + 'deg');
      lastDriftUpdate.current = current.time;
    }
    if (!current.entranceDone) {
      // Start when the garden can render, then settle once for this page load.
      // Refs survive countdown renders, visibility changes, and section navigation.
      current.entranceStart ??= performance.now();
      current.entranceElapsed = Math.min(ENTRANCE_DURATION,
        (performance.now() - current.entranceStart) / 1000);
      current.entranceDone = current.entranceElapsed >= ENTRANCE_DURATION;
    }
    const blend = 1 - Math.exp(-2.5 * step);
    current.x += (current.targetX - current.x) * blend;
    current.y += (current.targetY - current.y) * blend;
    garden.current.position.x = current.x * viewport.width * 0.002;
    garden.current.position.y = Math.sin(current.time * 0.22) * viewport.height * 0.002
      + current.y * viewport.height * 0.001;
    if (!current.entranceDone) {
      garden.current.position.multiplyScalar(MathUtils.smootherstep(current.entranceElapsed, 0.5, 4.3));
    }
  }, -1);

  return (
    <>
      <fog attach="fog" args={['#FFFEFA', 10.5, 20]} />
      <hemisphereLight args={['#FFFEFA', '#E8C4B8', 2.1]} />
      <ambientLight intensity={0.25} color="#FFFEFA" />
      <directionalLight position={[-4, 6, 7]} intensity={1.35} color="#FFFEFA" />
      <directionalLight position={[4, -1, 5]} intensity={0.7} color="#F3DADD" />
      <directionalLight position={[0, 5, -3]} intensity={0.95} color="#FFFEFA" />
      <group ref={garden}>
        {flowers.map((flower, index) => (
          <Flower key={index} {...flower} motion={motion} reducedMotion={reducedMotion} />
        ))}
      </group>
    </>
  );
}

function FlowerScene() {
  const container = useRef(null);
  const motion = useRef({ time: 0, windIntensity: 0.58, x: 0, y: 0, targetX: 0, targetY: 0,
    entranceStart: null, entranceElapsed: 0, entranceDone: false });
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.01);
    }, { threshold: 0.01 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const hero = container.current.closest('.hero-garden');
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reset = () => {
      motion.current.targetX = motion.current.targetY = 0;
    };
    const move = (event) => {
      if (!mouse.matches || event.pointerType !== 'mouse') return;
      const bounds = hero.getBoundingClientRect();
      motion.current.targetX = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
      );
      motion.current.targetY = Math.max(
        -1,
        Math.min(1, 1 - ((event.clientY - bounds.top) / bounds.height) * 2),
      );
    };

    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    mouse.addEventListener('change', reset);
    return () => {
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      mouse.removeEventListener('change', reset);
      reset();
    };
  }, [reducedMotion]);


  return (
    <div ref={container} data-ready={ready} className="hero-flowers pointer-events-none absolute inset-0">
      <SceneBoundary>
        <Canvas
          style={{ pointerEvents: 'none' }}
          role="img"
          aria-label="An animated garden of white and blush pink tulips and white lilies framing the birthday greeting"
          fallback={fallback}
          orthographic
          camera={{ position: [0, 0, 10], zoom: 100, near: 0.1, far: 30 }}
          frameloop={!ready ? 'never' : 'demand'}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          events={() => ({ enabled: false, priority: 0 })}
        >
          <Suspense fallback={null}>
            <Arrangement motion={motion} reducedMotion={reducedMotion} animate={ready && visible && !reducedMotion} onReady={setReady} />
          </Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}

export default memo(FlowerScene);
