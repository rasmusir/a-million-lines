uniform sampler2D texture1;
uniform sampler2D texture2;
varying float speed;
varying float alpha;
uniform vec2 view;

void main()
{
    
    vec2 pos1 = texture2D(texture1, vec2(position.x / 1024.0, position.y / 1024.0)).xy;
    vec2 pos2 = texture2D(texture2, vec2(position.x / 1024.0, position.y / 1024.0)).xy;
    float dist = distance(pos1, pos2);
    pos2 = pos1 + normalize(pos1 - pos2) * dist * 0.5;
    vec2 pos = mix(pos1, pos2, position.z);
    alpha = position.z;
    
    gl_PointSize = 2.0;
    speed = distance(vec2(0.0), texture2D(texture1, vec2(position.x / 1024.0, position.y / 1024.0)).zw) / 10.0;
    float aspect = view.x / view.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4((pos.x * view.x) / aspect - view.x / 2.0, 1.0, pos.y * view.y - view.y / 2.0, 1.0);
}