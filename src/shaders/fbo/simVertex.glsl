uniform float time;
varying vec2 vUv;
varying vec3 uPosition;
uniform vec2 pixels;
float pi = 3.141592653589793238;

void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}