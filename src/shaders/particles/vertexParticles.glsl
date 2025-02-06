uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
uniform sampler2D uPosition;
uniform vec2 pixels;
float pi = 3.141592653589793238;

void main(){
    vUv = uv;
    vec4 pos = texture2D(uPosition, vUv);
    vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.);
    gl_PointSize = 5. * (1. /-mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}