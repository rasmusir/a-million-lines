"use strict";

let Mouse;

let SIZE = 2048;


window.addEventListener("load", () => {
    Promise.all([
        LoadFile("sim.vert"),
        LoadFile("sim.frag"),
        LoadFile("part.vert"),
        LoadFile("part.frag")
        ]).then((values) => {
        Start({vert: values[0], frag: values[1], partVert: values[2], partFrag: values[3]});
    });
    
});

function Start(options)
{
    let renderer = new THREE.WebGLRenderer();
    let width = window.innerWidth;
    let height = window.innerHeight;
    renderer.setSize(width, height);
    let gl = renderer.getContext();
 
    //1 we need FLOAT Textures to store positions
    //https://github.com/KhronosGroup/WebGL/blob/master/sdk/tests/conformance/extensions/oes-texture-float.html
    if (!gl.getExtension("OES_texture_float")){
        throw new Error( "float textures not supported" );
    }

    //2 we need to access textures from within the vertex shader
    //https://github.com/KhronosGroup/WebGL/blob/90ceaac0c4546b1aad634a6a5c4d2dfae9f4d124/conformance-suites/1.0.0/extra/webgl-info.html
    if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0 ) {
        throw new Error( "vertex shader cannot read textures" );
    }
    document.body.appendChild(renderer.domElement);

    Mouse = {x: 0, y:0, down: false};
    renderer.domElement.addEventListener("mousedown", (e) => {
        e.preventDefault();
        Mouse.down = 1.0;
        let aspect = window.innerWidth / window.innerHeight;
        Mouse.x = ((e.clientX - e.target.offsetLeft) / e.target.clientWidth) * aspect;
        Mouse.y = (e.clientY - e.target.offsetTop) / e.target.clientHeight;
    });
    renderer.domElement.addEventListener("mousemove", (e) => {
        e.preventDefault();
        if (Mouse.down)
        {
            let aspect = window.innerWidth / window.innerHeight;
            Mouse.x = ((e.clientX - e.target.offsetLeft) / e.target.clientWidth) * aspect;
            Mouse.y = (e.clientY - e.target.offsetTop) / e.target.clientHeight;
        }
    });
    renderer.domElement.addEventListener("mouseup", (e) => {
        e.preventDefault();
        Mouse.down = 0.0;
    });

    let simPos = new Simulator(options);
    let particles = new Particles(options.partVert, options.partFrag, simPos);

    function render()
    {
        simPos.render(renderer);
        particles.render(renderer);
        requestAnimationFrame(render);
    }

    render();

    window.addEventListener( 'resize', () => {
        renderer.setSize( window.innerWidth, window.innerHeight );
    });
				
}

class Particles
{
    constructor(vert, frag, simulator)
    {
        this.scene = new THREE.Scene();
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.camera = new THREE.OrthographicCamera(-width/2, width/2, -height/2, height/2, 1, 1000);
        this.camera.position.y = 100;
        this.camera.lookAt(this.scene.position);
        this.simulator = simulator;

        this.geometry = new THREE.BufferGeometry();

        let verts = new Float32Array(SIZE * SIZE * 3 * 2);

        for (let x = 0; x < SIZE; x++)
            for (let y = 0; y < SIZE; y++)
            {
                let pos = (x * SIZE + y) * 6;
                verts[pos] = x;
                verts[pos + 1] = y;

                verts[pos + 3] = x;
                verts[pos + 4] = y;
                verts[pos + 5] = 1;
            }
        
        this.geometry.addAttribute("position", new THREE.BufferAttribute(verts, 3));
        this.material = new THREE.ShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            uniforms: {
                texture1: { type: "t", value: simulator.getParticleData()},
                texture2: { type: "t", value: simulator.getParticleDataPrevious()},
                view: {type: "v", value: new THREE.Vector2(width, height)}
            }
        });
        this.material.transparent = true;

        this.mesh = new THREE.LineSegments(this.geometry, this.material);

        this.scene.add(this.mesh);

        window.addEventListener( 'resize', () => {
            this.camera.left = window.innerWidth / - 2;
            this.camera.right = window.innerWidth / 2;
            this.camera.top = window.innerHeight / -2;
            this.camera.bottom = window.innerHeight / 2;
            this.camera.updateProjectionMatrix();
            this.material.uniforms.view.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
            this.material.uniforms.view.needsUpdate = true;
        });
    }

    render(renderer)
    {
        this.material.uniforms.texture1.value = this.simulator.getParticleData();
        this.material.uniforms.texture1.needsUpdate = true;
        this.material.uniforms.texture2.value = this.simulator.getParticleDataPrevious();
        this.material.uniforms.texture2.needsUpdate = true;
        renderer.render(this.scene, this.camera);
    }
}

class Simulator
{
    constructor(options)
    {
        this.first = true;
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-SIZE/2, SIZE/2, -SIZE/2, SIZE/2, 1, 1000);
        this.camera.position.y = 100;
        this.camera.lookAt(this.scene.position);

        let size = SIZE * SIZE * 4;
        let data = new Float32Array(size);
        let aspect = window.innerWidth / window.innerHeight;
        while (size--)
        {
            data[size] = Math.random();
            data[--size] = Math.random() * aspect;
        }

        this.firstTexture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
        this.firstTexture.needsUpdate = true;

        this.textureA = new THREE.WebGLRenderTarget(SIZE, SIZE, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type:THREE.FloatType});
        this.textureB = new THREE.WebGLRenderTarget(SIZE, SIZE, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type:THREE.FloatType});
        this.textureC = new THREE.WebGLRenderTarget(SIZE, SIZE, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type:THREE.FloatType});

        this.currentTexture = {texture: this.firstTexture};
        this.lastTexture = this.currentTexture;

        this.simMaterial = new THREE.ShaderMaterial({
            vertexShader: options.vert,
            fragmentShader: options.frag,
            uniforms: {
                texture1: { type: "t", value: this.currentTexture.texture},
                mouseX: {type: "f", value: 0},
                mouseY: {type: "f", value: 0},
                mouseDown: {type: "f", value: 0}
            }
        });

        let simPlaneGeometry = new THREE.PlaneGeometry(SIZE, SIZE);
        let simPlane = new THREE.Mesh(simPlaneGeometry, this.simMaterial);
        simPlane.rotation.x = Math.PI / 2;

        this.scene.add(simPlane);
    }

    render(renderer)
    {
        this.simMaterial.uniforms.texture1.value = this.currentTexture.texture;
        this.simMaterial.uniforms.texture1.needsUpdate = true;

        this.simMaterial.uniforms.mouseX.value = Mouse.x;
        this.simMaterial.uniforms.mouseY.value = Mouse.y;
        this.simMaterial.uniforms.mouseDown.value = Mouse.down;
        this.simMaterial.uniforms.mouseX.needsUpdate = true;
        this.simMaterial.uniforms.mouseY.needsUpdate = true;
        this.simMaterial.uniforms.mouseDown.needsUpdate = true;


        this.lastTexture = this.currentTexture;

        if (this.currentTexture == this.textureA)
        {
            this.currentTexture = this.textureB;
        }
        else if (this.currentTexture == this.textureB)
        {
            this.currentTexture = this.textureC;
        }
        else
        {
            this.currentTexture = this.textureA;
        }

        renderer.render(this.scene, this.camera, this.currentTexture);
    }

    getParticleData()
    {
        return this.currentTexture.texture;
    }
    getParticleDataPrevious()
    {
        return this.lastTexture.texture;
    }
}

function LoadFile(url)
{
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = () => resolve(xhr.responseText);
        xhr.send();
    });
}
