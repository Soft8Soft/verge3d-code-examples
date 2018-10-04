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

    this.camera = new v3d.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    this.scene  = new v3d.Scene();

    this.quad = new v3d.Mesh(new v3d.PlaneBufferGeometry(2, 2), null);
    this.quad.frustumCulled = false; // Avoid getting clipped
    this.scene.add(this.quad);

};

v3d.FilmPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.FilmPass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

        this.uniforms["tDiffuse"].value = readBuffer.texture;
        this.uniforms["time"].value += delta;

        this.quad.material = this.material;

        if (this.renderToScreen) {

            renderer.render(this.scene, this.camera);

        } else {

            renderer.render(this.scene, this.camera, writeBuffer, this.clear);

        }

    }

});
