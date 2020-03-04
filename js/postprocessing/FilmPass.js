/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.FilmPass = function(noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale) {

    v3d.Pass.call(this);

    if (v3d.FilmShader === undefined)
        console.error("v3d.FilmPass relies on v3d.FilmShader");

    var shader = v3d.FilmShader;

    this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);

    this.material = new v3d.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader

    });

    if (grayscale !== undefined)    this.uniforms.grayscale.value = grayscale;
    if (noiseIntensity !== undefined) this.uniforms.nIntensity.value = noiseIntensity;
    if (scanlinesIntensity !== undefined) this.uniforms.sIntensity.value = scanlinesIntensity;
    if (scanlinesCount !== undefined) this.uniforms.sCount.value = scanlinesCount;

    this.fsQuad = new v3d.Pass.FullScreenQuad(this.material);

};

v3d.FilmPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.FilmPass,

    render: function(renderer, writeBuffer, readBuffer, deltaTime /*, maskActive */) {

        this.uniforms["tDiffuse"].value = readBuffer.texture;
        this.uniforms["time"].value += deltaTime;

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
