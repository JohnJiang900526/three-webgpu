
export const  computeShaderPosition = `
  #define delta ( 1.0 / 60.0 )

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 tmpPos = texture2D( texturePosition, uv );
    vec3 pos = tmpPos.xyz;

    vec4 tmpVel = texture2D( textureVelocity, uv );
    vec3 vel = tmpVel.xyz;
    float mass = tmpVel.w;

    if ( mass == 0.0 ) {
      vel = vec3( 0.0 );
    }

    // Dynamics
    pos += vel * delta;
    gl_FragColor = vec4( pos, 1.0 );
  }
`;
export const  computeShaderVelocity = `
  // For PI declaration:
  #include <common>
  #define delta ( 1.0 / 60.0 )

  uniform float gravityConstant;
  uniform float density;

  const float width = resolution.x;
  const float height = resolution.y;

  float radiusFromMass( float mass ) {
    // Calculate radius of a sphere from mass and density
    return pow( ( 3.0 / ( 4.0 * PI ) ) * mass / density, 1.0 / 3.0 );
  }

  void main()	{

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float idParticle = uv.y * resolution.x + uv.x;

    vec4 tmpPos = texture2D( texturePosition, uv );
    vec3 pos = tmpPos.xyz;

    vec4 tmpVel = texture2D( textureVelocity, uv );
    vec3 vel = tmpVel.xyz;
    float mass = tmpVel.w;

    if ( mass > 0.0 ) {

      float radius = radiusFromMass( mass );

      vec3 acceleration = vec3( 0.0 );

      // Gravity interaction
      for ( float y = 0.0; y < height; y++ ) {

        for ( float x = 0.0; x < width; x++ ) {

          vec2 secondParticleCoords = vec2( x + 0.5, y + 0.5 ) / resolution.xy;
          vec3 pos2 = texture2D( texturePosition, secondParticleCoords ).xyz;
          vec4 velTemp2 = texture2D( textureVelocity, secondParticleCoords );
          vec3 vel2 = velTemp2.xyz;
          float mass2 = velTemp2.w;

          float idParticle2 = secondParticleCoords.y * resolution.x + secondParticleCoords.x;

          if ( idParticle == idParticle2 ) {
            continue;
          }

          if ( mass2 == 0.0 ) {
            continue;
          }

          vec3 dPos = pos2 - pos;
          float distance = length( dPos );
          float radius2 = radiusFromMass( mass2 );

          if ( distance == 0.0 ) {
            continue;
          }

          // Checks collision

          if ( distance < radius + radius2 ) {

            if ( idParticle < idParticle2 ) {

              // This particle is aggregated by the other
              vel = ( vel * mass + vel2 * mass2 ) / ( mass + mass2 );
              mass += mass2;
              radius = radiusFromMass( mass );

            }
            else {

              // This particle dies
              mass = 0.0;
              radius = 0.0;
              vel = vec3( 0.0 );
              break;

            }

          }

          float distanceSq = distance * distance;

          float gravityField = gravityConstant * mass2 / distanceSq;

          gravityField = min( gravityField, 1000.0 );

          acceleration += gravityField * normalize( dPos );

        }

        if ( mass == 0.0 ) {
          break;
        }
      }

      // Dynamics
      vel += delta * acceleration;

    }

    gl_FragColor = vec4( vel, mass );

  }
`;
export const  particleVertexShader = `
  // For PI declaration:
  #include <common>

  uniform sampler2D texturePosition;
  uniform sampler2D textureVelocity;

  uniform float cameraConstant;
  uniform float density;

  varying vec4 vColor;

  float radiusFromMass( float mass ) {
    // Calculate radius of a sphere from mass and density
    return pow( ( 3.0 / ( 4.0 * PI ) ) * mass / density, 1.0 / 3.0 );
  }


  void main() {


    vec4 posTemp = texture2D( texturePosition, uv );
    vec3 pos = posTemp.xyz;

    vec4 velTemp = texture2D( textureVelocity, uv );
    vec3 vel = velTemp.xyz;
    float mass = velTemp.w;

    vColor = vec4( 1.0, mass / 250.0, 0.0, 1.0 );

    vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );

    // Calculate radius of a sphere from mass and density
    //float radius = pow( ( 3.0 / ( 4.0 * PI ) ) * mass / density, 1.0 / 3.0 );
    float radius = radiusFromMass( mass );

    // Apparent size in pixels
    if ( mass == 0.0 ) {
      gl_PointSize = 0.0;
    }
    else {
      gl_PointSize = radius * cameraConstant / ( - mvPosition.z );
    }

    gl_Position = projectionMatrix * mvPosition;

  }
`;
export const  particleFragmentShader = `
  varying vec4 vColor;
  void main() {
    if ( vColor.y == 0.0 ) { discard; }

    float f = length( gl_PointCoord - vec2( 0.5, 0.5 ) );
    if ( f > 0.5 ) { discard; }
    gl_FragColor = vColor;
  }
`;
