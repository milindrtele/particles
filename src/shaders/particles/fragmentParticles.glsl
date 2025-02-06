uniform float time;
uniform float progress;
uniform sampler2D uPosition;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.141592653589793238;

void main() {
    vec4 pos = texture2D(uPosition, vUv);

    gl_FragColor = vec4(1.);
}
