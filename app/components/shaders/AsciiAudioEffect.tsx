"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import { useAudio } from "../../contexts/AudioContext";
import { usePerformance, getFrameDelay } from "../../contexts/PerformanceContext";
import { useTheme } from "../providers/themeProvider";

type Gl = WebGL2RenderingContext;

interface AsciiAudioEffectProps {
  className?: string;
}

// Helper to convert hex to RGB (0-1 range)
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [0.2, 1.0, 0.4]; // Default green
}

const vs = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){
  vUV=(aPos+1.0)*0.5;
  gl_Position=vec4(aPos,0.0,1.0);
}`;

const fsNoise = `#version 300 es
precision highp float;
out vec4 fragColor;
in vec2 vUV;

uniform vec2 uResolution;
uniform float uTime;
uniform float uNoiseStrength;
uniform float uNoiseScale;
uniform float uSpeed;
uniform vec3 uTint;
uniform float uDistortAmp;
uniform float uFrequency;
uniform float uZRate;
uniform float uBrightness;
uniform float uContrast;
uniform float uSeed1;
uniform float uSeed2;
uniform float uGlyphSharpness;

#define TWOPI 6.28318530718

vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=vec3(1.0)-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz - D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=vec4(1.0)-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec2 fragCoord=vUV*uResolution;
  vec2 r=uResolution;
  vec2 uv0=fragCoord/r;
  float speed=uSpeed;
  float noiseTime=uTime*speed;
  float n=snoise(vec3((fragCoord.x - r.x*0.5)*uNoiseScale,(fragCoord.y - r.y*0.5)*uNoiseScale,noiseTime));
  uv0.x=fract(uv0.x)+uNoiseStrength*sin(n*TWOPI);
  uv0.y=fract(uv0.y)+uNoiseStrength*cos(n*TWOPI);

  float animTime = uTime * uSpeed;
  float l; float z=animTime;
  vec2 p = uv0;
  
  // Generate single monochrome value instead of separate RGB
  vec2 uv=p; vec2 q=p; q-=0.5; q.x*=r.x/r.y; z+=uZRate; l=length(q);
  uv+=q/l*(sin(z+uSeed1)+1.0)*uDistortAmp*abs(sin(l*uFrequency - z - z + uSeed2));
  float intensity = uGlyphSharpness/length(mod(uv,1.0)-0.5);
  
  float gray = intensity/l;
  gray = (gray - 0.5) * uContrast + 0.5;
  gray *= uBrightness;
  gray = clamp(gray, 0.0, 1.0);
  
  // Apply tint to monochrome value
  vec3 col = vec3(gray) * uTint;
  
  // Transparent background - alpha based on brightness
  float alpha = gray;
  alpha = smoothstep(0.05, 0.3, alpha);
  
  fragColor=vec4(col, alpha);
}
`;

const fsAscii = `#version 300 es
precision highp float;
out vec4 fragColor;
in vec2 vUV;

uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform vec2 uSourceResolution;
uniform float uCell;
uniform int uBW;
uniform int uCharset;
uniform float uBrightness;
uniform float uContrast;
uniform vec3 uTint;
uniform float uTime;
uniform float uSpeed;
uniform float uDistortAmp;
uniform float uFrequency;
uniform float uZRate;
uniform float uSeed1;
uniform float uSeed2;

float gray(vec3 c){return dot(c, vec3(0.3,0.59,0.11));}

int pickCharFull(float g){
  int n = 0;
  if (g>0.9535) n=33061407; else if (g>0.9302) n=32045630; else if (g>0.9070) n=33081316; else if (g>0.8837) n=32045617; else if (g>0.8605) n=32032318; else if (g>0.8372) n=15255537; else if (g>0.8140) n=15022414; else if (g>0.7907) n=32575775; else if (g>0.7674) n=16267326; else if (g>0.7442) n=18667121; else if (g>0.7209) n=18732593; else if (g>0.6977) n=32540207; else if (g>0.6744) n=32641183; else if (g>0.6512) n=18415153; else if (g>0.6279) n=16272942; else if (g>0.6047) n=15018318; else if (g>0.5814) n=15022158; else if (g>0.5581) n=18405034; else if (g>0.5349) n=32045584; else if (g>0.5116) n=15255086; else if (g>0.4884) n=33061392; else if (g>0.4651) n=18400814; else if (g>0.4419) n=18444881; else if (g>0.4186) n=16269839; else if (g>0.3953) n=6566222; else if (g>0.3721) n=13177118; else if (g>0.3488) n=14954572; else if (g>0.3256) n=17463428; else if (g>0.3023) n=18157905; else if (g>0.2791) n=18393412; else if (g>0.2558) n=32641156; else if (g>0.2326) n=17318431; else if (g>0.2093) n=15239300; else if (g>0.1860) n=18393220; else if (g>0.1628) n=14749828; else if (g>0.1395) n=12652620; else if (g>0.1163) n=4591748; else if (g>0.0930) n=459200; else if (g>0.0698) n=4329476; else if (g>0.0465) n=131200; else if (g>0.0233) n=0; else n=0;
  return n;
}

float character(int n, vec2 p){
  p=floor(p*vec2(-4.0,4.0)+2.5);
  if (clamp(p.x,0.0,4.0)==p.x){
    if (clamp(p.y,0.0,4.0)==p.y){
      int a=int(round(p.x)+5.0*round(p.y));
      if (((n>>a)&1)==1) return 1.0;
    }
  }
  return 0.0;
}

void main(){
  vec2 fragCoord=vUV*uResolution;
  vec2 cellSize=vec2(uCell);
  vec2 block=floor(fragCoord/cellSize)*cellSize;

  vec2 src = uSourceResolution;
  float srcAspect = src.x/src.y;
  float dstAspect = uResolution.x/uResolution.y;
  vec2 uvBlock = (block+0.5)/uResolution;
  vec2 uvSource;
  if (srcAspect > dstAspect) {
    float scale = dstAspect/srcAspect;
    uvSource = vec2(uvBlock.x*scale + (1.0-scale)*0.5, uvBlock.y);
  } else {
    float scale = srcAspect/dstAspect;
    uvSource = vec2(uvBlock.x, uvBlock.y*scale + (1.0-scale)*0.5);
  }

  vec2 dispP = uvSource - 0.5;
  float l = length(dispP)+1e-5;
  float animTime = uTime * uSpeed;
  vec2 uvJitter = uvSource + (dispP/l) * (sin(animTime+uSeed1)+1.0) * uDistortAmp * abs(sin(l*uFrequency - animTime - animTime + uSeed2)) * 0.002;
  vec3 col=texture(uTexture, clamp(uvJitter, 0.0, 1.0)).rgb;
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBrightness;
  col *= uTint;
  float g=gray(col);

  int n = pickCharFull(g);

  vec2 p = mod(fragCoord/(uCell*0.5), 2.0) - vec2(1.0);
  float charVal = character(n,p);
  vec3 outCol = (uBW==1)? vec3(charVal) : col*charVal;
  
  // Transparent background
  float alpha = charVal > 0.5 ? 1.0 : 0.0;
  fragColor=vec4(outCol, alpha);
}
`;

const makeShader = (gl: Gl, type: number, src: string) => {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(sh));
  }
  return sh;
};

const makeProgram = (gl: Gl, vsSrc: string, fsSrc: string) => {
  const p = gl.createProgram()!;
  const v = makeShader(gl, gl.VERTEX_SHADER, vsSrc);
  const f = makeShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  return p;
};

const quad = (gl: Gl) => {
  const vao = gl.createVertexArray()!;
  const vbo = gl.createBuffer()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return { vao, vbo };
};

export function AsciiAudioEffect({ className = "" }: AsciiAudioEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resRef = useRef<{
    gl: Gl;
    vao: WebGLVertexArrayObject;
    progNoise: WebGLProgram;
    progAscii: WebGLProgram;
    uNoise: Record<string, WebGLUniformLocation | null>;
    uAscii: Record<string, WebGLUniformLocation | null>;
    texScene: WebGLTexture;
    fbScene: WebGLFramebuffer;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const audioRef = useRef({ bass: 0, mid: 0, treble: 0, intensity: 1 });
  const colorRef = useRef<[number, number, number]>([0.2, 1.0, 0.4]);
  const { audioMetrics, intensity } = useAudio();
  const { theme } = useTheme() as { theme: { config: { shader?: string; primary: string } } | null };
  const { settings } = usePerformance();
  const perfRef = useRef(settings);

  // Keep perfRef updated
  useEffect(() => {
    perfRef.current = settings;
  }, [settings]);

  // Update audio ref
  useEffect(() => {
    audioRef.current = { ...audioMetrics, intensity };
  }, [audioMetrics, intensity]);

  // Update color from theme
  useEffect(() => {
    const shaderColor = theme?.config?.shader || theme?.config?.primary || "#22c55e";
    colorRef.current = hexToRgb(shaderColor);
  }, [theme]);

  const init = useCallback((gl: Gl, w: number, h: number) => {
    const progNoise = makeProgram(gl, vs, fsNoise);
    const progAscii = makeProgram(gl, vs, fsAscii);
    const { vao } = quad(gl);
    
    const uNoise = {
      uResolution: gl.getUniformLocation(progNoise, "uResolution"),
      uTime: gl.getUniformLocation(progNoise, "uTime"),
      uNoiseStrength: gl.getUniformLocation(progNoise, "uNoiseStrength"),
      uNoiseScale: gl.getUniformLocation(progNoise, "uNoiseScale"),
      uSpeed: gl.getUniformLocation(progNoise, "uSpeed"),
      uTint: gl.getUniformLocation(progNoise, "uTint"),
      uDistortAmp: gl.getUniformLocation(progNoise, "uDistortAmp"),
      uFrequency: gl.getUniformLocation(progNoise, "uFrequency"),
      uZRate: gl.getUniformLocation(progNoise, "uZRate"),
      uBrightness: gl.getUniformLocation(progNoise, "uBrightness"),
      uContrast: gl.getUniformLocation(progNoise, "uContrast"),
      uSeed1: gl.getUniformLocation(progNoise, "uSeed1"),
      uSeed2: gl.getUniformLocation(progNoise, "uSeed2"),
      uGlyphSharpness: gl.getUniformLocation(progNoise, "uGlyphSharpness"),
    };
    
    const uAscii = {
      uResolution: gl.getUniformLocation(progAscii, "uResolution"),
      uTexture: gl.getUniformLocation(progAscii, "uTexture"),
      uSourceResolution: gl.getUniformLocation(progAscii, "uSourceResolution"),
      uCell: gl.getUniformLocation(progAscii, "uCell"),
      uBW: gl.getUniformLocation(progAscii, "uBW"),
      uCharset: gl.getUniformLocation(progAscii, "uCharset"),
      uBrightness: gl.getUniformLocation(progAscii, "uBrightness"),
      uContrast: gl.getUniformLocation(progAscii, "uContrast"),
      uTint: gl.getUniformLocation(progAscii, "uTint"),
      uTime: gl.getUniformLocation(progAscii, "uTime"),
      uSpeed: gl.getUniformLocation(progAscii, "uSpeed"),
      uDistortAmp: gl.getUniformLocation(progAscii, "uDistortAmp"),
      uFrequency: gl.getUniformLocation(progAscii, "uFrequency"),
      uZRate: gl.getUniformLocation(progAscii, "uZRate"),
      uSeed1: gl.getUniformLocation(progAscii, "uSeed1"),
      uSeed2: gl.getUniformLocation(progAscii, "uSeed2"),
    };

    const texScene = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texScene);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const fbScene = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texScene, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { gl, vao, progNoise, progAscii, uNoise, uAscii, texScene, fbScene };
  }, []);

  const render = useCallback((timestamp: number) => {
    // FPS throttling
    const frameDelay = getFrameDelay(perfRef.current.targetFPS);
    if (frameDelay > 0 && timestamp - lastFrameTimeRef.current < frameDelay) {
      rafRef.current = requestAnimationFrame(render);
      return;
    }
    lastFrameTimeRef.current = timestamp;

    const res = resRef.current;
    const canvas = canvasRef.current;
    if (!res || !canvas) return;
    
    const { gl, vao, progNoise, progAscii, uNoise, uAscii, texScene, fbScene } = res;
    if (startRef.current === 0) startRef.current = timestamp;
    const t = (timestamp - startRef.current) / 1000;
    const w = canvas.width, h = canvas.height;

    // Get audio values
    const { bass, mid, treble, intensity: audioIntensity } = audioRef.current;
    const bassSigned = (bass - 0.5) * 2.0;
    const midSigned = (mid - 0.5) * 2.0;
    const trebleSigned = (treble - 0.5) * 2.0;
    
    // Audio-reactive parameters
    const audioDistort = 2 + (bassSigned + midSigned) * audioIntensity * 3;
    const audioBrightness = 1.5 + trebleSigned * audioIntensity * 0.8;
    const audioSpeed = 1.0 + midSigned * audioIntensity * 0.5;
    const audioFrequency = 3 + trebleSigned * audioIntensity * 2;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Pass 1: Render noise to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(progNoise);
    gl.bindVertexArray(vao);
    // Get theme color
    const [r, g, b] = colorRef.current;

    gl.uniform2f(uNoise.uResolution, w, h);
    gl.uniform1f(uNoise.uTime, t);
    gl.uniform1f(uNoise.uNoiseStrength, 0);
    gl.uniform1f(uNoise.uNoiseScale, 0.0002);
    gl.uniform1f(uNoise.uSpeed, audioSpeed);
    gl.uniform3f(uNoise.uTint, r, g, b); // Theme color
    gl.uniform1f(uNoise.uDistortAmp, audioDistort);
    gl.uniform1f(uNoise.uFrequency, audioFrequency);
    gl.uniform1f(uNoise.uZRate, 0.03);
    gl.uniform1f(uNoise.uBrightness, audioBrightness);
    gl.uniform1f(uNoise.uContrast, 2);
    gl.uniform1f(uNoise.uSeed1, 6.08);
    gl.uniform1f(uNoise.uSeed2, 2.19);
    gl.uniform1f(uNoise.uGlyphSharpness, 0.01);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 2: Render ASCII to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(progAscii);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texScene);
    gl.uniform2f(uAscii.uSourceResolution, w, h);
    gl.uniform1i(uAscii.uTexture, 0);
    gl.uniform2f(uAscii.uResolution, w, h);
    gl.uniform1f(uAscii.uCell, 12);
    gl.uniform1i(uAscii.uBW, 0);
    gl.uniform1i(uAscii.uCharset, 0);
    gl.uniform1f(uAscii.uBrightness, audioBrightness);
    gl.uniform1f(uAscii.uContrast, 2);
    gl.uniform3f(uAscii.uTint, r, g, b); // Theme color
    gl.uniform1f(uAscii.uTime, t);
    gl.uniform1f(uAscii.uSpeed, audioSpeed);
    gl.uniform1f(uAscii.uDistortAmp, audioDistort);
    gl.uniform1f(uAscii.uFrequency, audioFrequency);
    gl.uniform1f(uAscii.uZRate, 0.03);
    gl.uniform1f(uAscii.uSeed1, 6.08);
    gl.uniform1f(uAscii.uSeed2, 2.19);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    rafRef.current = window.requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    
    const dpr = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    resRef.current = init(gl, canvas.width, canvas.height);
    rafRef.current = requestAnimationFrame((t) => render(t));
    
    const onResize = () => {
      const c = canvasRef.current;
      const rr = resRef.current;
      if (!c || !rr) return;
      const d = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);
      const W = Math.floor(c.clientWidth * d), H = Math.floor(c.clientHeight * d);
      if (W === c.width && H === c.height) return;
      c.width = W;
      c.height = H;
      rr.gl.viewport(0, 0, W, H);
      rr.gl.bindTexture(rr.gl.TEXTURE_2D, rr.texScene);
      rr.gl.texImage2D(rr.gl.TEXTURE_2D, 0, rr.gl.RGBA, W, H, 0, rr.gl.RGBA, rr.gl.UNSIGNED_BYTE, null);
    };
    
    window.addEventListener("resize", onResize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [init, render]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
      style={{ background: "transparent" }}
    />
  );
}

export default AsciiAudioEffect;
