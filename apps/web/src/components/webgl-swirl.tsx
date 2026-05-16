import { onCleanup, onMount } from "solid-js";

const VS = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

const FS = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  vec3 themeColor = vec3(0.0, 0.941, 1.0);
  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    float scale = 48.0;
    vec2 id = floor(uv * scale);
    vec2 f = fract(uv * scale);
    float r = length(id / scale);
    float a = atan(id.y, id.x);
    float t = u_time * 0.4;
    float swirl = a + r * 12.0 - t;
    float pattern = sin(swirl * 8.0);
    float isVisible = step(0.2, pattern);
    float mask = smoothstep(0.95, 0.1, r);
    isVisible *= step(0.01, mask);
    float noise = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
    isVisible *= step(0.12, noise);
    float boxSize = 0.38 * isVisible;
    vec2 centerDist = abs(f - 0.5);
    float drawBox = step(max(centerDist.x, centerDist.y), boxSize);
    if (drawBox > 0.5 && isVisible > 0.0) {
      gl_FragColor = vec4(themeColor, 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function WebGLSwirl(props: { class?: string }) {
  let canvas: HTMLCanvasElement | null = null;

  onMount(() => {
    if (!canvas) return;
    const el = canvas;
    const gl = (el.getContext("webgl") ??
      el.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    function resize() {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }
    window.addEventListener("resize", resize);
    resize();

    const vs = compileShader(gl, gl.VERTEX_SHADER, VS);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const timeLoc = gl.getUniformLocation(program, "u_time");

    const start = Date.now();
    let rafId: number;

    function render() {
      resize();
      gl!.uniform2f(resLoc, el.width, el.height);
      gl!.uniform1f(timeLoc, (Date.now() - start) / 1000);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    }
    render();

    onCleanup(() => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    });
  });

  return <canvas ref={(el) => (canvas = el)} class={props.class} width="700" height="700" />;
}
