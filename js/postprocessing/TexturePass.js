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

    this.fsQuad = new v3d.Pass.FullScreenQuad(null);

};

v3d.TexturePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.TexturePass,

    render: function(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        this.fsQuad.material = this.material;

        this.uniforms["opacity"].value = this.opacity;
        this.uniforms["tDiffuse"].value = this.map;
        this.material.transparent = (this.opacity < 1.0);

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        if (this.clear) renderer.clear();
        this.fsQuad.render(renderer);

        renderer.autoClear = oldAutoClear;

    }

});
