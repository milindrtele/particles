uniform float time;
uniform float progress;
uniform sampler2D uPosition;
uniform sampler2D uColor;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.141592653589793238;

void main() {
    vec4 pos = texture2D(uPosition, vUv);
    vec4 color = texture2D(uColor, vUv);

    //gl_FragColor = vec4(1., 1., 1., 1.);
    gl_FragColor = vec4(color);
}
