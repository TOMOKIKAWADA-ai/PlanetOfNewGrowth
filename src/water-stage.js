import * as THREE from 'three';

// Islands use the same local-axis convention as Game.isWaterStageLand so the
// rendered shoreline matches where gameplay treats the ground as land.
const SHORE_GLSL = /* glsl */ `
uniform vec4 uPatchShape[PATCH_COUNT];
uniform vec4 uPatchAxis[PATCH_COUNT];

float waterHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float waterNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(waterHash(i), waterHash(i + vec2(1.0, 0.0)), u.x),
    mix(waterHash(i + vec2(0.0, 1.0)), waterHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float shoreDistance(vec2 p) {
  float distanceToShore = 1e4;
  for (int i = 0; i < PATCH_COUNT; i++) {
    vec4 shape = uPatchShape[i];
    vec4 axis = uPatchAxis[i];
    vec2 delta = p - shape.xy;
    vec2 local = vec2(delta.x * axis.x + delta.y * axis.y, -delta.x * axis.y + delta.y * axis.x);
    vec2 normalized = local / shape.zw;
    float angle = atan(normalized.y, normalized.x);
    float edge = 1.0 + sin(angle * 3.0 + axis.z) * 0.055 + sin(angle * 7.0 - axis.z * 1.3) * 0.025;
    distanceToShore = min(distanceToShore, (length(normalized) - edge) * min(shape.z, shape.w));
  }
  float breakup = waterNoise(p * 0.21) * 0.9 + waterNoise(p * 0.73) * 0.35;
  return distanceToShore + breakup - 0.6;
}
`;

function createPatchUniforms(patches) {
  return {
    uPatchShape: {
      value: patches.map((patch) => new THREE.Vector4(
        patch.x,
        patch.z,
        patch.radius * patch.scaleX,
        patch.radius * patch.scaleZ
      ))
    },
    uPatchAxis: {
      value: patches.map((patch) => new THREE.Vector4(
        Math.cos(patch.rotation),
        Math.sin(patch.rotation),
        patch.seed + 0.45,
        0
      ))
    }
  };
}

// Same field as the GLSL version minus the noise breakup; used to place props.
export function waterStageShoreDistance(patches, x, z) {
  let distanceToShore = Infinity;
  for (const patch of patches) {
    const dx = x - patch.x;
    const dz = z - patch.z;
    const cosine = Math.cos(patch.rotation);
    const sine = Math.sin(patch.rotation);
    const radiusX = patch.radius * patch.scaleX;
    const radiusZ = patch.radius * patch.scaleZ;
    const nx = (dx * cosine + dz * sine) / radiusX;
    const nz = (-dx * sine + dz * cosine) / radiusZ;
    const angle = Math.atan2(nz, nx);
    const seed = patch.seed + 0.45;
    const edge = 1 + Math.sin(angle * 3 + seed) * 0.055 + Math.sin(angle * 7 - seed * 1.3) * 0.025;
    distanceToShore = Math.min(distanceToShore, (Math.hypot(nx, nz) - edge) * Math.min(radiusX, radiusZ));
  }
  return distanceToShore;
}

export function loadTiledTexture(url, renderer) {
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

// Tileable ripple normals from periodic value-noise octaves.
export function createWaveNormalTexture(size = 256, seed = 11) {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const lattice = new Float32Array(64 * 64).map(() => random());
  const smooth = (t) => t * t * (3 - 2 * t);
  const periodicNoise = (x, y, periodX, periodY) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const at = (ix, iy) => lattice[(((iy % periodY) + periodY) % periodY) * 64 + (((ix % periodX) + periodX) % periodX)];
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return top + (bottom - top) * fy;
  };
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 0;
      let amplitude = 1;
      for (let period = 4; period <= 64; period *= 2) {
        // Fewer cells along y stretch the ripples so they read as wind-driven.
        const periodY = period * 0.75;
        value += periodicNoise((x / size) * period, (y / size) * periodY, period, periodY) * amplitude;
        amplitude *= 0.52;
      }
      height[y * size + x] = value;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const strength = 5.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const nx = (left - right) * strength;
      const ny = (up - down) * strength;
      const inverse = 1 / Math.hypot(nx, ny, 1);
      const offset = (y * size + x) * 4;
      data[offset] = Math.round((nx * inverse * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((ny * inverse * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((inverse * 0.5 + 0.5) * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Ground under the whole water stage: grass on the islands, wet mud at the
// waterline and submerged asphalt further out, blended by shore distance.
export function createWaterStageTerrainMaterial({ patches, landMap, shoreMap, bedMap, tileSize }) {
  const material = new THREE.MeshStandardMaterial({ map: landMap, roughness: 0.94, metalness: 0 });
  const uniforms = {
    ...createPatchUniforms(patches),
    uShoreMap: { value: shoreMap },
    uBedMap: { value: bedMap },
    uTileSize: { value: tileSize }
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.defines = { ...shader.defines, PATCH_COUNT: patches.length };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTerrainPosition;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvTerrainPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vTerrainPosition;
uniform sampler2D uShoreMap;
uniform sampler2D uBedMap;
uniform float uTileSize;
float terrainWet;
float terrainSubmerged;
${SHORE_GLSL}`
      )
      .replace(
        '#include <map_fragment>',
        `{
  vec2 worldUv = vTerrainPosition.xz / uTileSize;
  float shore = shoreDistance(vTerrainPosition.xz);
  float variation = waterNoise(vTerrainPosition.xz * 0.045);
  vec2 rotatedUv = mat2(0.8, -0.6, 0.6, 0.8) * worldUv * 0.61 + 0.37;
  vec3 land = mix(texture2D(map, worldUv).rgb, texture2D(map, rotatedUv).rgb, smoothstep(0.35, 0.65, variation));
  vec3 mud = mix(texture2D(uShoreMap, worldUv * 1.35).rgb, texture2D(uShoreMap, rotatedUv * 1.1).rgb, variation);
  vec3 bed = mix(texture2D(uBedMap, worldUv).rgb, texture2D(uBedMap, rotatedUv).rgb, smoothstep(0.3, 0.7, variation));
  float landWeight = 1.0 - smoothstep(-3.4, -1.1, shore + (variation - 0.5) * 1.6);
  terrainSubmerged = smoothstep(0.2, 2.8, shore);
  terrainWet = smoothstep(-1.6, 0.1, shore);
  vec3 ground = mix(mud, land, landWeight);
  ground = mix(ground, bed, terrainSubmerged);
  ground *= mix(1.0, 0.68, terrainWet * (1.0 - terrainSubmerged * 0.4));
  diffuseColor.rgb *= ground;
}`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, terrainWet * (1.0 - terrainSubmerged));'
      );
  };
  material.customProgramCacheKey = () => 'water-stage-terrain';
  return material;
}

export const MAX_WATER_CONTACTS = 16;

export function createWaterSurfaceMaterial({ patches, bedMap, normalMap, tileSize, sunDirection }) {
  const material = new THREE.ShaderMaterial({
    name: 'WaterStageSurface',
    transparent: true,
    depthWrite: false,
    fog: true,
    defines: { PATCH_COUNT: patches.length, MAX_WATER_CONTACTS },
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uNormalMap: { value: null },
        uBedMap: { value: null },
        uTileSize: { value: tileSize },
        uSunDirection: { value: sunDirection.clone().normalize() },
        uSunColor: { value: new THREE.Color(0xfff1d6) },
        uShallowColor: { value: new THREE.Color(0x3d8a7c) },
        uDeepColor: { value: new THREE.Color(0x0b2e38) },
        uSkyColor: { value: new THREE.Color(0x56737c) },
        uHorizonColor: { value: new THREE.Color(0x8ea3a3) },
        uFoamColor: { value: new THREE.Color(0xe8f0ec) },
        uLightLevel: { value: 0.95 },
        // x, y = world x/z centre and z = radius (0 disables) of things standing in the water.
        uContacts: { value: Array.from({ length: MAX_WATER_CONTACTS }, () => new THREE.Vector3()) },
        ...createPatchUniforms(patches)
      }
    ]),
    vertexShader: /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform sampler2D uNormalMap;
uniform sampler2D uBedMap;
uniform float uTileSize;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;
uniform vec3 uFoamColor;
uniform float uLightLevel;
uniform vec3 uContacts[MAX_WATER_CONTACTS];
varying vec3 vWorldPosition;
${SHORE_GLSL}

float contactDistance(vec2 p) {
  float distanceToContact = 1e4;
  for (int i = 0; i < MAX_WATER_CONTACTS; i++) {
    vec3 contact = uContacts[i];
    if (contact.z > 0.0) distanceToContact = min(distanceToContact, length(p - contact.xy) - contact.z);
  }
  return distanceToContact;
}

vec3 sampleWaveNormal(vec2 uv) {
  return texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
}

vec3 waveNormal(vec2 p, float calm) {
  vec3 n1 = sampleWaveNormal(p * 0.045 + uTime * vec2(0.011, 0.007));
  vec3 n2 = sampleWaveNormal(p * 0.083 + uTime * vec2(-0.009, 0.013));
  vec3 n3 = sampleWaveNormal(p * 0.19 + uTime * vec2(0.021, -0.017));
  vec2 slope = (n1.xy * 0.34 + n2.xy * 0.26 + n3.xy * 0.16) * calm;
  return normalize(vec3(slope.x, 1.0, slope.y));
}

float caustics(vec2 p, float time) {
  vec2 q = p - 250.0;
  vec2 i = q;
  float c = 1.0;
  float intensity = 0.005;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = q + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(q.x / (sin(i.x + t) / intensity), q.y / (cos(i.y + t) / intensity)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}

void main() {
  vec2 p = vWorldPosition.xz;
  float shore = shoreDistance(p);
  if (shore < -0.9) discard;

  // Buildings standing in the flood get the same shallows and foam as a shore.
  float edge = min(shore, contactDistance(p) + waterNoise(p * 1.3) * 0.5);
  float depth = 0.12 + max(edge, 0.0) * 0.32;
  vec3 normal = waveNormal(p, mix(0.45, 1.0, smoothstep(0.0, 3.0, edge)));
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

  vec2 refraction = normal.xz * (0.25 + min(depth, 3.0) * 0.12);
  vec2 bedUv = (p + refraction) / uTileSize;
  vec3 bed = texture2D(uBedMap, bedUv).rgb;
  float causticMask = exp(-depth * 0.32);
  float causticLight = caustics(p * 0.42 + refraction * 0.6, uTime * 0.55)
    + caustics(p * 0.27 - refraction * 0.4 + 31.0, uTime * 0.41) * 0.6;
  bed *= uLightLevel * (1.0 + causticLight * 1.35 * causticMask);

  vec3 transmittance = exp(-depth * vec3(0.42, 0.17, 0.13));
  vec3 scatter = mix(uShallowColor, uDeepColor, 1.0 - exp(-depth * 0.16)) * uLightLevel;
  vec3 underwater = mix(scatter, bed * transmittance, exp(-depth * 0.2));

  vec3 reflected = reflect(-viewDirection, normal);
  vec3 sky = mix(uHorizonColor, uSkyColor, smoothstep(0.05, 0.75, reflected.y));
  float facing = max(dot(normal, viewDirection), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  vec3 color = mix(underwater, sky * uLightLevel, clamp(fresnel, 0.0, 0.65));

  vec3 halfVector = normalize(uSunDirection + viewDirection);
  float highlight = max(dot(normal, halfVector), 0.0);
  color += uSunColor * (pow(highlight, 380.0) * 6.0 + pow(highlight, 60.0) * 0.12);

  float foamNoise = waterNoise(p * 1.7 + vec2(uTime * 0.21, -uTime * 0.13)) * 0.6
    + waterNoise(p * 4.3 - uTime * 0.35) * 0.4;
  float surge = sin(edge * 3.1 - uTime * 1.25 + foamNoise * 2.6) * 0.5 + 0.5;
  float foamBand = 1.0 - smoothstep(0.0, 1.8, edge);
  float foam = foamBand * smoothstep(0.68, 1.0, surge * 0.5 + foamNoise * 0.6) * 0.75;
  foam += (1.0 - smoothstep(-0.7, 0.35, edge)) * smoothstep(0.45, 0.9, foamNoise) * 0.7;
  color = mix(color, uFoamColor * uLightLevel, clamp(foam, 0.0, 1.0) * 0.65);

  float alpha = smoothstep(-0.9, 0.25, shore);
  alpha *= mix(0.55, 1.0, smoothstep(0.0, 2.6, shore));
  alpha = max(alpha, clamp(foam, 0.0, 1.0) * smoothstep(-0.9, -0.3, shore));
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
  });
  // UniformsUtils.merge clones its inputs, so textures are attached afterwards.
  material.uniforms.uNormalMap.value = normalMap;
  material.uniforms.uBedMap.value = bedMap;
  return material;
}
