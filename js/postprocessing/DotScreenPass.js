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

    this.camera = new v3d.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    this.scene  = new v3d.Scene();

    this.quad = new v3d.Mesh(new v3d.PlaneBufferGeometry(2, 2), null);
    this.quad.frustumCulled = false; // Avoid getting clipped
    this.scene.add(this.quad);

};

v3d.DotScreenPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.DotScreenPass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

        this.uniforms["tDiffuse"].value = readBuffer.texture;
        this.uniforms["tSize"].value.set(readBuffer.width, readBuffer.height);

        this.quad.material = this.material;

        if (this.renderToScreen) {

            renderer.render(this.scene, this.camera);

        } else {

            renderer.render(this.scene, this.camera, writeBuffer, this.clear);

        }

    }

});
