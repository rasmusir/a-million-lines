varying float speed;
varying float alpha;

void main()
{
    vec3 color = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), speed / 3.0);
    gl_FragColor = vec4(color, 0.1);
}