/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.DotScreenPass = function(center, angle, scale) {

    v3d.Pass.call(this);

    if (v3d.DotScreenShader === undefined)
        console.error("v3d.DotScreenPass relies on v3d.DotScreenShader");

    var shader = v3d.DotScreenShader;

    this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);

    if (center !== undefined) this.uniforms["center"].value.copy(center);
    if (angle !== undefined) this.uniforms["angle"].value = angle;
    if (scale !== undefined) this.uniforms["scale"].value = scale;

    this.material = new v3d.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader

    });

    this.fsQuad = new v3d.Pass.FullScreenQuad(this.material);

};

v3d.DotScreenPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.DotScreenPass,

    render: function(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

        this.uniforms["tDiffuse"].value = readBuffer.texture;
        this.uniforms["tSize"].value.set(readBuffer.width, readBuffer.height);

        if (this.renderToScreen) {

            renderer.setRenderTarget(null);
            this.fsQuad.render(renderer);

        } else {

            renderer.setRenderTarget(writeBuffer);
            if (this.clear) renderer.clear();
            this.fsQuad.render(renderer);

        }

    }

});
