/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.SavePass = function(renderTarget) {

    v3d.Pass.call(this);

    if (v3d.CopyShader === undefined)
        console.error("v3d.SavePass relies on v3d.CopyShader");

    var shader = v3d.CopyShader;

    this.textureID = "tDiffuse";

    this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);

    this.material = new v3d.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader

    });

    this.renderTarget = renderTarget;

    if (this.renderTarget === undefined) {

        this.renderTarget = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: v3d.LinearFilter, magFilter: v3d.LinearFilter, format: v3d.RGBFormat, stencilBuffer: false });
        this.renderTarget.texture.name = "SavePass.rt";

    }

    this.needsSwap = false;

    this.fsQuad = new v3d.Pass.FullScreenQuad(this.material);

};

v3d.SavePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.SavePass,

    render: function(renderer, writeBuffer, readBuffer) {

        if (this.uniforms[this.textureID]) {

            this.uniforms[this.textureID].value = readBuffer.texture;

        }

        renderer.setRenderTarget(this.renderTarget);
        if (this.clear) renderer.clear();
        this.fsQuad.render(renderer);

    }

});
