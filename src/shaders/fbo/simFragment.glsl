uniform float time;
uniform float progress;
uniform sampler2D uPosition;
uniform sampler2D uInfo;
uniform vec4 resolution;
uniform bool uGravityBool;
varying vec2 vUv;
varying vec3 vPosition;
uniform vec2 uMouse;

float PI = 3.141592653589793238;
#define PI 3.1415926538

// const float EPS = 0.001;
// vec4 mod289(vec4 x) {
//     return x - floor(x * (1.0 / 289.0)) * 289.0;
// }
// float mod289(float x) {
//     return x - floor(x * (1.0 / 289.0)) * 289.0;
// }
// vec4 permute(vec4 x) {
//     return mod289(((x*34.0)+1.0)*x);
// }
// float permute(float x) {
//     return mod289(((x*34.0)+1.0)*x);
// }
// vec4 taylorInvSqrt(vec4 r) {
//     return 1.79284291400159 - 0.85373472095314 * r;
// }
// float taylorInvSqrt(float r) {
//     return 1.79284291400159 - 0.85373472095314 * r;
// }
// vec4 grad4(float j, vec4 ip) {
//     const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
//     vec4 p, s;
//     p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
//     p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
//     s = vec4(lessThan(p, vec4(0.0)));
//     p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
//     return p;
// }
// #define F4 0.309016994374947451

// vec4 simplexNoiseDerivatives (vec4 v) {
//     const vec4  C = vec4( 0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
//     vec4 i = floor(v + dot(v, vec4(F4)) );
//     vec4 x0 = v -   i + dot(i, C.xxxx);
//     vec4 i0;
//     vec3 isX = step( x0.yzw, x0.xxx );
//     vec3 isYZ = step( x0.zww, x0.yyz );
//     i0.x = isX.x + isX.y + isX.z;
//     i0.yzw = 1.0 - isX;
//     i0.y += isYZ.x + isYZ.y;
//     i0.zw += 1.0 - isYZ.xy;
//     i0.z += isYZ.z;
//     i0.w += 1.0 - isYZ.z;
//     vec4 i3 = clamp( i0, 0.0, 1.0 );
//     vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
//     vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
//     vec4 x1 = x0 - i1 + C.xxxx;
//     vec4 x2 = x0 - i2 + C.yyyy;
//     vec4 x3 = x0 - i3 + C.zzzz;
//     vec4 x4 = x0 + C.wwww;
//     i = mod289(i);
//     float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
//     vec4 j1 = permute( permute( permute( permute (
//     i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
//     + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
//     + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
//     + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
//     vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
//     vec4 p0 = grad4(j0, ip);
//     vec4 p1 = grad4(j1.x, ip);
//     vec4 p2 = grad4(j1.y, ip);
//     vec4 p3 = grad4(j1.z, ip);
//     vec4 p4 = grad4(j1.w, ip);
//     vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
//     p0 *= norm.x;
//     p1 *= norm.y;
//     p2 *= norm.z;
//     p3 *= norm.w;
//     p4 *= taylorInvSqrt(dot(p4, p4));
//     vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point
    
//     vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
//     vec3 m0 = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0); //(0.5 - x^2) where x is the distance
    
//     vec2 m1 = max(0.5 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
//     vec3 temp0 = -6.0 * m0 * m0 * values0;
//     vec2 temp1 = -6.0 * m1 * m1 * values1;
//     vec3 mmm0 = m0 * m0 * m0;
//     vec2 mmm1 = m1 * m1 * m1;
//     float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
//     float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
//     float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
//     // float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;
    
    
//     // return vec4(dx, dy, dz, dw) * 49.0;
//     return vec4(dx, dy, dz, 0.0) * 49.0;
// }
// vec3 curl( in vec3 p, in float noiseTime, in float persistence ) {
//     vec4 xNoisePotentialDerivatives = vec4(0.0);
//     vec4 yNoisePotentialDerivatives = vec4(0.0);
//     // vec4 zNoisePotentialDerivatives = vec4(0.0);
    
    
//     for (int i = 0; i < 2; ++i) {
//         float twoPowI = pow(2.0, float(i));
//         float scale = 0.5 * twoPowI * pow(persistence, float(i));
//         xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * scale;
//         yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
//         // zNoisePotentialDerivatives += snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
//     }
//     return vec3(
//     yNoisePotentialDerivatives[1] - xNoisePotentialDerivatives[1], yNoisePotentialDerivatives[2] - xNoisePotentialDerivatives[2], yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[0]
//     );
// }

////////////////////////////////////////////cnoise////////////////////////////////////////////////////
//	Classic Perlin 3D Noise 
//	by Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

void main() {
    vec4 posTex = texture2D(uPosition, vUv);
    vec4 info = texture2D(uInfo, vUv);                       
    float uGravity = 0.0;
    vec3 mouse = vec3(uMouse, -5.0);//vec2(sin(-time), cos(-time));

    vec3 target = texture2D(uInfo, vUv).rgb;
    float attractionStrength = 5.0;
    //vec3 velocity;


    vec3 pos = posTex.xyz;
    vec3 position = pos;
    //float dist = length(pos.xy - mouse);
    //vec2 dir = normalize(pos.xy - mouse);

    // Simulate gravity
    vec3 gravityCenter = vec3(0.0, 0.0, 0.0); // where the particles collapse to
    vec3 dirToCenter = normalize(mouse - pos);
    float dist = length(mouse - pos);
    float gravityForce = uGravity / (dist * dist + 1.0);

    vec3 velocity;

    // Add curl noise or mouse interaction
    //velocity.xy += curl(pos.xyz, time * 0.1, 0.1).xy * 0.0005;
    //velocity.z += curl(pos.xyz, time * 0.1, 0.1).z * 0.003;

    if(uGravityBool){
        velocity += dirToCenter * gravityForce * (dist/10.0);
    }else{
        //velocity += dirToCenter * gravityForce;
        velocity += (target - posTex.xyz) * attractionStrength/100.0 ;
    }

    float noise = cnoise(vec3(pos.x, pos.y, time * 0.1)) * 0.01;


    pos += velocity;
    //pos.z += curl(pos.xyz, time * 0.1, 0.1).z * 0.003;
    pos.z += noise * 0.3; // Add some vertical noise
    
    gl_FragColor = vec4(pos, 1.0);
    
    // Update position
    //pos += velocity;

    //gl_FragColor = vec4(target, 1.0);//info;//vec4(posTex.xyz, 0.0);//vec4(pos, 1.0); 
}
