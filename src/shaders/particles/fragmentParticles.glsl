uniform float time;
uniform float progress;
uniform sampler2D uPosition;
uniform sampler2D uColor;
uniform sampler2D uOldColor;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.141592653589793238;

void main() {
    vec4 pos = texture2D(uPosition, vUv);
    vec4 oldColor = texture2D(uOldColor, vUv);
    vec4 targetColor = texture2D(uColor, vUv);
    float attractionStrength = 1.0;
    vec4 velocity = vec4(0.0);
    vec4 color = vec4(0.0);

    //velocity += dirToCenter * gravityForce;
        velocity += (targetColor - oldColor) * attractionStrength ;

        color += velocity;

        vec4 A = clamp(velocity, 0.0, 1.0);


    //gl_FragColor = vec4(1., 1., 1., 1.);
    gl_FragColor = vec4(targetColor);
}

