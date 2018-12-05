/**
 * @author HypnosNova / https://www.threejs.org.cn/gallery/
 */

v3d.AfterimagePass = function(damp) {

    v3d.Pass.call(this);

    if (v3d.AfterimageShader === undefined)
        console.error("v3d.AfterimagePass relies on v3d.AfterimageShader");

    this.shader = v3d.AfterimageShader;

    this.uniforms = v3d.UniformsUtils.clone(this.shader.uniforms);

    this.uniforms["damp"].value = damp !== undefined ? damp : 0.96;

    this.textureComp = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, {

        minFilter: v3d.LinearFilter,
        magFilter: v3d.NearestFilter,
        format: v3d.RGBAFormat

    });

    this.textureOld = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, {

        minFilter: v3d.LinearFilter,
        magFilter: v3d.NearestFilter,
        format: v3d.RGBAFormat

    });

    this.shaderMaterial = new v3d.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: this.shader.vertexShader,
        fragmentShader: this.shader.fragmentShader

    });

    this.sceneComp = new v3d.Scene();
    this.scene = new v3d.Scene();

    this.camera = new v3d.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.camera.position.z = 1;

    var geometry = new v3d.PlaneBufferGeometry(2, 2);

    this.quadComp = new v3d.Mesh(geometry, this.shaderMaterial);
    this.sceneComp.add(this.quadComp);

    var material = new v3d.MeshBasicMaterial({ 
        map: this.textureComp.texture
    });

    var quadScreen = new v3d.Mesh(geometry, material);
    this.scene.add(quadScreen);

};

v3d.AfterimagePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.AfterimagePass,

    render: function(renderer, writeBuffer, readBuffer) {

        this.uniforms["tOld"].value = this.textureOld.texture;
        this.uniforms["tNew"].value = readBuffer.texture;

        this.quadComp.material = this.shaderMaterial;

        renderer.render(this.sceneComp, this.camera, this.textureComp);
        renderer.render(this.scene, this.camera, this.textureOld);
        
        if (this.renderToScreen) {
            
            renderer.render(this.scene, this.camera);
            
        } else {
            
            renderer.render(this.scene, this.camera, writeBuffer, this.clear);
            
        }

    }

});
