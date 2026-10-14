import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, MathUtils, Mesh, MeshStandardMaterial, CatmullRomCurve3, TubeGeometry, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Broad, continuous satin surfaces: a rounded tulip cup and a swept lily ribbon.
// All poses share topology, so unfolding stays on the GPU without rebuilding meshes.
export function createPetalGeometry(species) {
  const lily = species === 'lily';
  const rows = 24, columns = 12;
  const colors = [], indices = [];
  const ivory = new Color('#FFFEFA'), blush = new Color('#F3DADD'), gold = new Color('#D6B879');
  const states = [0, 0.04, 0.48, 1.015, 1].map((open) => {
    const vertices = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const profile = Math.sin(Math.PI * t) ** (lily ? 0.72 : 0.5);
      for (let column = 0; column <= columns; column++) {
        const u = column / columns * 2 - 1;
        const width = (lily ? 0.077 : 0.095) * profile * (0.83 + open * 0.17);
        const radius = lily
          ? 0.015 + 0.205 * t ** 1.12 * (0.28 + open * 0.72)
          : 0.018 + 0.095 * Math.sin(t * Math.PI * 0.64) * (0.65 + open * 0.35);
        const height = lily
          ? 0.21 * (t - open * (0.72 * t ** 2 + 0.42 * t ** 4))
          : 0.205 * t - open * 0.026 * t ** 3;
        // The raised edges and recessed midrib read as softly cupped silk, not flat blades.
        const cup = (lily ? 0.026 : 0.034) * profile;
        vertices.push(u * width, height + u * u * cup,
          radius - u * u * cup + Math.sin(t * Math.PI) * 0.003 * (1 - u * u));
        if (open === 0) {
          const color = ivory.clone().lerp(blush, (1 - u * u) * profile * (lily ? 0.12 : 0.28))
            .lerp(gold, (1 - t) ** 5 * 0.16);
          colors.push(color.r, color.g, color.b);
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    return geometry;
  });
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  states.forEach((state) => { state.setIndex(indices); state.computeVertexNormals(); });
  const geometry = states[0];
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.morphAttributes.position = states.slice(1).map((state) => state.attributes.position);
  geometry.morphAttributes.normal = states.slice(1).map((state) => state.attributes.normal);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Sculpted foliage replaces the textured botanical assets. Shared geometry keeps
// the whole garden light; leaf anchors retain the existing delayed breeze motion.
export function createFlowerStem(species) {
  const lily = species === 'lily';
  const height = lily ? 0.52 : 0.415;
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0, 0), new Vector3(-0.013, height * 0.35, 0.008),
    new Vector3(0.009, height * 0.72, 0), new Vector3(0, height, 0),
  ]);
  const stem = new TubeGeometry(curve, 20, 0.004, 6, false);
  stem.setAttribute('leafAnchor', new Float32BufferAttribute(new Float32Array(stem.attributes.position.count * 3), 3));
  stem.setAttribute('leafFlex', new Float32BufferAttribute(new Float32Array(stem.attributes.position.count * 2), 2));
  stem.deleteAttribute('uv');
  const parts = [stem];
  for (let leaf = 0; leaf < (lily ? 4 : 2); leaf++) {
    const positions = [], anchors = [], flex = [], indices = [];
    const angle = leaf * 2.4 + 0.6;
    const anchor = curve.getPoint(0.16 + leaf * (lily ? 0.13 : 0.21));
    for (let row = 0; row <= 16; row++) {
      const t = row / 16;
      const reach = (lily ? 0.12 : 0.15) * Math.sin(t * 1.5);
      for (let column = 0; column <= 6; column++) {
        const u = column / 3 - 1;
        const width = Math.sin(t * Math.PI) ** 0.85 * (lily ? 0.03 : 0.042) * u;
        positions.push(anchor.x + Math.sin(angle) * reach + Math.cos(angle) * width,
          anchor.y + (lily ? 0.115 : 0.2) * t - 0.045 * t ** 3 + 0.012 * u * u * Math.sin(t * Math.PI),
          anchor.z + Math.cos(angle) * reach - Math.sin(angle) * width);
        anchors.push(anchor.x, anchor.y, anchor.z);
        flex.push(t * t, leaf * 1.71);
      }
    }
    for (let row = 0; row < 16; row++) for (let column = 0; column < 6; column++) {
      const a = row * 7 + column, b = a + 7;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geometry = new BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('leafAnchor', new Float32BufferAttribute(anchors, 3));
    geometry.setAttribute('leafFlex', new Float32BufferAttribute(flex, 2));
    geometry.computeVertexNormals();
    parts.push(geometry);
  }
  const model = new Group();
  const material = new MeshStandardMaterial({ color: '#ADC3A4', roughness: 0.86, side: DoubleSide });
  model.add(new Mesh(mergeGeometries(parts), material));
  parts.forEach((part) => part.dispose());
  if (lily) {
    const gold = new MeshStandardMaterial({ color: '#D6B879', roughness: 0.72 });
    const stamens = [];
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const tip = new Vector3(Math.sin(angle) * 0.03, height + 0.07, Math.cos(angle) * 0.03);
      const filament = new TubeGeometry(new CatmullRomCurve3([
        new Vector3(0, height, 0), new Vector3(tip.x * 0.4, height + 0.04, tip.z * 0.4), tip,
      ]), 8, 0.0014, 4, false);
      const anther = new SphereGeometry(0.005, 8, 6).scale(0.65, 1.8, 0.65).translate(tip.x, tip.y, tip.z);
      stamens.push(filament, anther);
    }
    stamens.forEach((part) => {
      part.deleteAttribute('uv');
      part.setAttribute('leafAnchor', new Float32BufferAttribute(new Float32Array(part.attributes.position.count * 3), 3));
      part.setAttribute('leafFlex', new Float32BufferAttribute(new Float32Array(part.attributes.position.count * 2), 2));
    });
    model.add(new Mesh(mergeGeometries(stamens), gold));
    stamens.forEach((part) => part.dispose());
  }
  return model;
}

export function bloomWeights(progress) {
  const p = MathUtils.clamp(progress, 0, 1);
  const ease = (t) => t * t * (3 - 2 * t);
  const unfold = ease(p);
  // One continuous unfurl; remove the old contraction and overshoot choreography.
  return [(1 - unfold) ** 2, 2 * unfold * (1 - unfold), 0, unfold ** 2];
}
