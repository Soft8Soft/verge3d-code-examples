/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.TexturePass = function(map, opacity) {

    v3d.Pass.call(this);

    if (v3d.CopyShader === undefined)
        console.error("v3d.TexturePass relies on v3d.CopyShader");

    var shader = v3d.CopyShader;

    this.map = map;
    this.opacity = (opacity !== undefined) ? opacity : 1.0;

    this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);

    this.material = new v3d.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        depthTest: false,
        depthWrite: false

    });

    this.needsSwap = false;

    this.camera = new v3d.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    this.scene  = new v3d.Scene();

    this.quad = new v3d.Mesh(new v3d.PlaneBufferGeometry(2, 2), null);
    this.quad.frustumCulled = false; // Avoid getting clipped
    this.scene.add(this.quad);

};

v3d.TexturePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.TexturePass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        this.quad.material = this.material;

        this.uniforms["opacity"].value = this.opacity;
        this.uniforms["tDiffuse"].value = this.map;
        this.material.transparent = (this.opacity < 1.0);

        renderer.render(this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear);

        renderer.autoClear = oldAutoClear;
    }

});
