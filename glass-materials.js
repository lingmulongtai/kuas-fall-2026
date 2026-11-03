/* Good Machines Liquid Glass Lab, retrieved 2026-11-03.
 * https://goodmachines.ai/lab/liquid-glass
 * Original presets and optical shaders; only the shape-array capacity is supplied
 * by the host to accommodate a dashboard. No optical values or shader math changed.
 */
(()=>{
'use strict';
const presets = [
  {
    "id": "apple",
    "name": "Apple Liquid Glass",
    "note": "Our remake of Apple’s regular Liquid Glass. The edge lens is light, there’s just enough blur to keep labels readable, and small shapes switch to light or dark to match what’s behind them.",
    "p": {
      "refraction": 18,
      "bezel": 20,
      "magnify": 1,
      "dispersion": 0.04,
      "edge": "convex",
      "sizeScale": true,
      "blur": 6,
      "frost": 0.1,
      "vibrancy": 1.35,
      "brightness": 0.02,
      "dim": 0,
      "appearance": "auto",
      "pickup": 0.35,
      "tintAmount": 0,
      "tint": "#e8593c",
      "specular": 0.7,
      "rimWidth": 1.4,
      "lightAngle": -135,
      "shadow": 0.3,
      "merge": 10,
      "interactive": true
    }
  },
  {
    "id": "apple-clear",
    "name": "Apple clear",
    "note": "Apple’s clear variant. Almost no blur or haze, and it doesn’t switch between light and dark. Bright content behind it is dimmed by 35%, as Apple suggests.",
    "p": {
      "refraction": 18,
      "bezel": 16,
      "magnify": 1,
      "dispersion": 0.05,
      "edge": "convex",
      "sizeScale": true,
      "blur": 0.5,
      "frost": 0.02,
      "vibrancy": 1.1,
      "brightness": 0,
      "dim": 0.35,
      "appearance": "light",
      "pickup": 0.1,
      "tintAmount": 0,
      "tint": "#e8593c",
      "specular": 0.65,
      "rimWidth": 1.4,
      "lightAngle": -135,
      "shadow": 0.18,
      "merge": 10,
      "interactive": true
    }
  },
  {
    "id": "thick",
    "name": "Thick lens",
    "note": "A deep, clear lens with a wide rim. It magnifies the middle and folds the image hard at the edge.",
    "p": {
      "refraction": 46,
      "bezel": 44,
      "magnify": 1.28,
      "dispersion": 0.12,
      "edge": "convex",
      "sizeScale": false,
      "blur": 0,
      "frost": 0,
      "vibrancy": 1.05,
      "brightness": 0.02,
      "dim": 0,
      "appearance": "light",
      "pickup": 0,
      "tintAmount": 0,
      "tint": "#e8593c",
      "specular": 0.8,
      "rimWidth": 2.2,
      "lightAngle": -135,
      "shadow": 0.45,
      "merge": 24,
      "interactive": true
    }
  },
  {
    "id": "frosted",
    "name": "Frosted",
    "note": "Sandblasted glass. Heavy blur and haze hide the detail but keep the color.",
    "p": {
      "refraction": 8,
      "bezel": 12,
      "magnify": 1,
      "dispersion": 0,
      "edge": "convex",
      "sizeScale": true,
      "blur": 22,
      "frost": 0.3,
      "vibrancy": 1.4,
      "brightness": 0.04,
      "dim": 0,
      "appearance": "auto",
      "pickup": 0.6,
      "tintAmount": 0,
      "tint": "#e8593c",
      "specular": 0.35,
      "rimWidth": 1,
      "lightAngle": -135,
      "shadow": 0.25,
      "merge": 14,
      "interactive": true
    }
  },
  {
    "id": "clear",
    "name": "Plain lens",
    "note": "Plain clear glass: a sharp lens with no blur, haze or tint.",
    "p": {
      "refraction": 26,
      "bezel": 22,
      "magnify": 1.06,
      "dispersion": 0,
      "edge": "convex",
      "sizeScale": false,
      "blur": 0,
      "frost": 0,
      "vibrancy": 1,
      "brightness": 0,
      "dim": 0,
      "appearance": "light",
      "pickup": 0,
      "tintAmount": 0,
      "tint": "#e8593c",
      "specular": 0.5,
      "rimWidth": 1,
      "lightAngle": -135,
      "shadow": 0.15,
      "merge": 14,
      "interactive": true
    }
  },
  {
    "id": "prism",
    "name": "Prism",
    "note": "Strong dispersion at the rim, so edges break into color.",
    "p": {
      "refraction": 30,
      "bezel": 30,
      "magnify": 1.1,
      "dispersion": 0.85,
      "edge": "convex",
      "sizeScale": false,
      "blur": 0,
      "frost": 0,
      "vibrancy": 1.2,
      "brightness": 0.02,
      "dim": 0,
      "appearance": "light",
      "pickup": 0,
      "tintAmount": 0,
      "tint": "#e8593c",
      "specular": 0.9,
      "rimWidth": 1.6,
      "lightAngle": -135,
      "shadow": 0.25,
      "merge": 20,
      "interactive": true
    }
  }
];
for(const preset of presets){ Object.freeze(preset.p); Object.freeze(preset); }
function shaders(maxShapes=8){
const MAX_SHAPES=maxShapes;
const VERT = `#version 300 es
in vec2 a; out vec2 v_uv;
void main(){ v_uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

// The photo, cover-fitted to the stage, drawn into the scene cache: a region of the
// world around the view (see buildCache), at a resolution that suits the zoom.
const UI_MAX = 6;
const COVER = `#version 300 es
precision highp float;
#define UIMAX ${UI_MAX}
uniform sampler2D u_img; uniform vec4 u_fit; uniform vec4 u_rect; in vec2 v_uv; out vec4 o;
// The underlay: flat capsules (switch and slider tracks, the segmented control's
// background) that sit on the image, under the glass, so knobs lens them.
uniform int u_un; uniform vec4 u_u0[UIMAX]; uniform vec4 u_u1[UIMAX]; uniform vec2 u_world;   // centre, half size (world px); rgba
// u_rect: the cached world region, as x, y, w, h fractions of the stage (y down).
// u_fit: cover scale (xy) and the scroll offset in image uv (zw). The image texture
// wraps with MIRRORED_REPEAT, so a scrolled image continues as its mirror, seamlessly.
void main(){
  vec2 s = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 w = u_rect.xy + s * u_rect.zw;
  vec2 uv = (w - 0.5) * u_fit.xy + 0.5 + u_fit.zw;
  vec3 c = texture(u_img, uv).rgb;
  if (u_un > 0) {
    vec2 wp = w * u_world; float aa = 0.6 * max(fwidth(wp.x), fwidth(wp.y));
    for (int i = 0; i < UIMAX; i++) {
      if (i >= u_un) break;
      vec4 b = u_u0[i]; float r = min(b.z, b.w);
      vec2 q = abs(wp - b.xy) - b.zw + r; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      c = mix(c, u_u1[i].rgb, u_u1[i].a * (1.0 - smoothstep(-aa, aa, d)));
    }
  }
  o = vec4(c, 1.0);
}`;

// One separable Gaussian pass of the blur pyramid. σ is small (≤ 1.5 texels of the
// level being written), so 17 taps over ±3σ are plenty.
const BLUR = `#version 300 es
precision highp float;
uniform sampler2D u_tex; uniform vec2 u_step; uniform float u_sigma, u_lod; in vec2 v_uv; out vec4 o;
void main(){
  vec4 acc = vec4(0.0); float ws = 0.0; float sp = u_sigma * 3.0 / 8.0;
  for (int i = -8; i <= 8; i++) {
    float x = float(i) * sp; float w = exp(-0.5 * x * x / (u_sigma * u_sigma));
    acc += textureLod(u_tex, v_uv + u_step * x, u_lod) * w; ws += w;
  }
  o = acc / ws;
}`;

const GLASS = `#version 300 es
precision highp float;
#define MAXS ${MAX_SHAPES}
uniform sampler2D u_scene, u_blur;   // scene cache with mips; Gaussian blur pyramid (one σ doubling per mip level)
uniform vec2 u_res, u_dpr;  // output size in px; output px per CSS px on x and y (they differ by rounding)
uniform vec4 u_map;        // screen CSS px to cache uv: uv = p * xy + zw
uniform float u_sceneLod;  // cache texels per screen pixel, as a mip level (> 0 only while the camera moves)
uniform vec2 u_texel;      // one cache texel in uv
uniform int u_n;
uniform vec4 u_s0[MAXS];   // centre xy, half size xy (screen CSS px, y down)
uniform vec4 u_s1[MAXS];   // corner radius, dark 0..1, appear 0..1, size factor
uniform vec4 u_s2[MAXS];   // edge shape (0 convex, 1 lip), solid 0..1, presence 0..1, merge distance (screen px)
// Material per shape. Lengths arrive in screen px, already zoomed.
uniform vec4 u_m0[MAXS];   // refraction, edge width, magnify, dispersion
uniform vec4 u_m1[MAXS];   // blur σ in units of pyramid level 0, frost, vibrancy, brightness
uniform vec4 u_m2[MAXS];   // tint rgb, tint amount
uniform vec4 u_m3[MAXS];   // colour from below, rim light, rim width, shadow
uniform vec4 u_touch;      // x, y, strength, radius
uniform float u_merge, u_pickLod, u_dimK, u_zoom;
uniform vec2 u_light;
in vec2 v_uv; out vec4 o;

float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sdRB(vec2 p, vec2 b, float r){ r = min(r, min(b.x, b.y)); vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float smin(float a, float b, float k){ if (k <= 0.0) return min(a, b); float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// A shape's distance. Presence below 1 (a split piece being born or absorbed) erodes
// it, so it grows out of its parent and sinks back in without a pop.
float sdS(int i, vec2 p){ return sdRB(p - u_s0[i].xy, u_s0[i].zw, u_s1[i].x) + (1.0 - u_s2[i].z) * 30.0 * u_zoom; }
float field(vec2 p){
  float d = 1e5;
  for (int i = 0; i < MAXS; i++) { if (i >= u_n) break; d = smin(d, sdS(i, p), u_s2[i].w); }
  return d;
}
// Edge height profiles across the edge width, x = 0 at the outside, 1 where it goes flat.
// Convex squircle (kube.io); Lip = mix(convex, 1 - convex, smootherstep(x)), a raised rim
// around a shallow dip (kube.io's profile for Apple's switch knob).
float hSq(float x){ float u = 1.0 - x; return pow(max(1.0 - u * u * u * u, 0.0), 0.25); }
float hLip(float x){ float c = hSq(x); return mix(c, 1.0 - c, x * x * x * (x * (x * 6.0 - 15.0) + 10.0)); }
vec2 toUV(vec2 p){ return p * u_map.xy + u_map.zw; }
// What shows through at p with blur bl (σ in units of pyramid level 0, which is
// 3 cache texels). From level 0 up, the GPU blends two pyramid levels. Below it, four
// taps at ±σ on the sharp scene (a per-axis σ of exactly σ), fading into level 0.
// lod: mip level for the sharp scene, from how much the lens squeezes it here.
vec3 through(vec2 p, float bl, float lod){
  vec2 uv = toUV(p);
  if (bl >= 1.0) return textureLod(u_blur, uv, log2(bl)).rgb;
  if (bl <= 0.001) return textureLod(u_scene, uv, lod).rgb;
  vec2 q = u_texel * min(bl * 3.0, 1.5);
  vec3 c4 = 0.25 * (textureLod(u_scene, uv + q, lod).rgb + textureLod(u_scene, uv - q, lod).rgb
                  + textureLod(u_scene, uv + vec2(q.x, -q.y), lod).rgb + textureLod(u_scene, uv + vec2(-q.x, q.y), lod).rgb);
  return bl > 0.5 ? mix(c4, textureLod(u_blur, uv, 0.0).rgb, bl * 2.0 - 1.0) : c4;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_dpr;
  vec3 bg = textureLod(u_scene, toUV(p), u_sceneLod).rgb;
  if (u_n == 0) { o = vec4(bg, 1.0); return; }
  float d = field(p);
  // Beyond the scrim and shadow reach nothing changes, so skip the rest.
  if (d > 96.0 * u_zoom) { o = vec4(bg, 1.0); return; }
  // Dimming layer for bright images (Apple: 35% for clear glass), kept to a soft scrim around the glass.
  float scrim = u_dimK * (1.0 - smoothstep(0.0, 90.0 * u_zoom, d));
  bg *= 1.0 - scrim;

  // Per-shape values blended by closeness, so merged shapes share geometry and material smoothly.
  float dmin = 1e5; for (int i = 0; i < MAXS; i++) { if (i >= u_n) break; dmin = min(dmin, sdS(i, p)); }
  vec2 c = vec2(0.0); vec3 per = vec3(0.0); float ws = 0.0;
  vec4 m0 = vec4(0.0), m1 = vec4(0.0), m2 = vec4(0.0), m3 = vec4(0.0); vec2 m4 = vec2(0.0);
  for (int i = 0; i < MAXS; i++) {
    if (i >= u_n) break;
    float di = sdS(i, p);
    float w = exp(-(di - dmin) / (6.0 * u_zoom + u_merge)) * max(u_s2[i].z, 1e-4);   // a piece being born barely counts yet
    c += u_s0[i].xy * w; per += u_s1[i].yzw * w; ws += w;
    m0 += u_m0[i] * w; m1 += u_m1[i] * w; m2 += u_m2[i] * w; m3 += u_m3[i] * w; m4 += u_s2[i].xy * w;
  }
  c /= ws; per /= ws; m0 /= ws; m1 /= ws; m2 /= ws; m3 /= ws; m4 /= ws;
  float lipK = m4.x, solid = m4.y;
  float dark = per.x, appear = per.y, sizeK = per.z;
  float refr = m0.x, bezel = m0.y, mag = m0.z, disp = m0.w;
  float bl = m1.x, frost = m1.y, vib = m1.z, bright = m1.w;
  vec3 tint = m2.rgb; float tintAmt = m2.w;
  float pick = m3.x, spec = m3.y, rimW = m3.z, shadow = m3.w;

  // Shadow: soft and slightly below, outside the glass only.
  if (shadow > 0.0 && d > 0.0) {
    float ds = field(p - vec2(0.0, 5.0 * u_zoom));
    bg *= 1.0 - shadow * 0.32 * appear * (1.0 - smoothstep(-10.0 * u_zoom, 26.0 * u_zoom, ds)) * (0.6 + 0.4 * (1.0 - dark));
  }
  float aa = 0.75 / u_dpr.x;
  float cov = 1.0 - smoothstep(-aa, aa, d);
  if (cov <= 0.0) { o = vec4(bg, 1.0); return; }

  // Outward edge direction from the distance field.
  float e = 0.5;
  vec2 g = vec2(field(p + vec2(e, 0.0)) - field(p - vec2(e, 0.0)), field(p + vec2(0.0, e)) - field(p - vec2(0.0, e)));
  g = dot(g, g) > 1e-10 ? normalize(g) : vec2(0.0);

  // Convex squircle rim: height h(x) = (1 - (1 - x)^4)^(1/4) across the edge width.
  float t = max(-d, 0.0);
  float B = max(bezel * sizeK, 1.0);
  float x = clamp(t / B, 0.0, 1.0), u1 = 1.0 - x;
  float slope = min(u1 * u1 * u1 * pow(max(1.0 - u1 * u1 * u1 * u1, 1e-4), -0.75), 60.0);
  if (lipK > 0.001) {
    // Lip: numeric slope. Past the rim's crest it turns negative, so the dip bends outward.
    float xa = max(x - 0.004, 0.0), xb = min(x + 0.004, 1.0);
    slope = mix(slope, clamp((hLip(xb) - hLip(xa)) / (xb - xa), -60.0, 60.0), lipK);
  }
  vec3 n = normalize(vec3(g * slope, 1.0));
  // Refract a straight-down view ray into glass (IOR 1.5). It bends inward,
  // so the rim shows content from further inside, squeezed toward the edge.
  vec3 T = refract(vec3(0.0, 0.0, -1.0), n, 1.0 / 1.5);
  vec2 off = T.xy / max(-T.z, 0.2) * refr * sizeK * appear;
  off += (c - p) * (1.0 - 1.0 / mix(1.0, mag, appear));

  // Mip level from the screen-space rate of the refracted lookup, so the squeezed
  // rim filters like texture() would (taken here, before any per-pixel branch).
  vec2 ddx = dFdx(toUV(p + off)) / u_texel, ddy = dFdy(toUV(p + off)) / u_texel;
  float lod = max(u_sceneLod, 0.5 * log2(max(max(dot(ddx, ddx), dot(ddy, ddy)), 1e-8)));
  vec3 col;
  if (disp > 0.001) {
    float k = disp * 0.45;
    col = vec3(through(p + off * (1.0 - k), bl, lod).r, through(p + off, bl, lod).g, through(p + off * (1.0 + k), bl, lod).b);
  } else col = through(p + off, bl, lod);

  col *= 1.0 - scrim;
  vec3 under = textureLod(u_blur, toUV(p), u_pickLod).rgb;
  float lu = luma(under);
  float l = luma(col); col = max(mix(vec3(l), col, vib), 0.0);

  // Frost: a haze that is white over light content and graphite over dark,
  // tinted toward the colour underneath by 'pickup'.
  vec3 base = mix(vec3(1.0), vec3(0.10, 0.105, 0.11), dark);
  vec3 sat = clamp(mix(vec3(lu), under, 1.6), 0.0, 1.0);
  vec3 tinted = mix(mix(sat, vec3(1.0), 0.45), sat * 0.45, dark);
  vec3 haze = mix(base, tinted, pick);
  col = mix(col, haze, frost * appear);
  col = mix(col, col * mix(vec3(1.0), sat / max(max(sat.r, max(sat.g, sat.b)), 0.05), 0.5), pick * 0.25);
  // Tint: maps the chosen colour to the brightness of what is behind, so it stays see-through.
  col = mix(col, tint * (0.45 + 0.75 * luma(col)), tintAmt * appear);
  col += bright;
  // Knobs at rest are an opaque white pill, as on iOS; touched, they turn to clear glass.
  col = mix(col, vec3(0.975), solid * appear);

  // Light: a thin specular rim, strongest facing the light and on the far side,
  // plus a soft reflection across the curved part of the edge.
  float rim = exp(-t / max(rimW, 0.3));
  float f = dot(g, u_light);
  float lobe = 0.12 + pow(max(f, 0.0), 1.6) + 0.8 * pow(max(-f, 0.0), 1.6);
  float fres = pow(1.0 - n.z, 2.0);
  col += spec * appear * (rim * lobe * 0.95 + fres * 0.14 * (0.4 + 0.6 * max(f, 0.0)));

  // Touch: glass lights up from under the finger.
  if (u_touch.z > 0.001) { vec2 q = p - u_touch.xy; col += vec3(0.26) * u_touch.z * exp(-dot(q, q) / (2.0 * u_touch.w * u_touch.w)); }

  o = vec4(mix(bg, clamp(col, 0.0, 1.0), cov), 1.0);
}`;


return {VERT,COVER,BLUR,GLASS};
}
const materials=Object.freeze({presets:Object.freeze(presets),shaders});
if(typeof module!=='undefined') module.exports=materials;
else window.GlassMaterials=materials;
})();
