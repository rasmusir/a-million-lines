uniform sampler2D texture1;
uniform float mouseX;
uniform float mouseY;
uniform float mouseDown;
varying vec2 vUv;

void main() {
    vec4 all = texture2D(texture1, vUv);
    vec2 pos = all.xy;
    vec2 vel = all.zw;


    if (mouseDown > 0.0)
    {
        vec2 mouse = vec2(mouseX, 1.0 - mouseY);
        float force = 0.5 / distance(mouse, pos);

        vel -= (mouse - pos) * force;
    }
    else
    {
        vel = vel * 0.98;
    }
    
    pos -= vel / 1000.0;

    /*
    if (pos.x > 1.0) pos.x -= 1.0;
    if (pos.x < 0.0) pos.x += 1.0;
    if (pos.y > 1.0) pos.y -= 1.0;
    if (pos.y < 0.0) pos.y += 1.0;
    */

    gl_FragColor = vec4(pos.x, pos.y, vel.x, vel.y);
}