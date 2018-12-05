/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.ShaderPass = function(shader, textureID) {

    v3d.Pass.call(this);

    this.textureID = (textureID !== undefined) ? textureID : "tDiffuse";

    if (shader instanceof v3d.ShaderMaterial) {

        this.uniforms = shader.uniforms;

        this.material = shader;

    } else if (shader) {

        this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);

        this.material = new v3d.ShaderMaterial({

            defines: Object.assign({}, shader.defines),
            uniforms: this.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader

        });

    }

    this.camera = new v3d.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    this.scene = new v3d.Scene();

    this.quad = new v3d.Mesh(new v3d.PlaneBufferGeometry(2, 2), null);
    this.quad.frustumCulled = false; // Avoid getting clipped
    this.scene.add(this.quad);

};

v3d.ShaderPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.ShaderPass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

        if (this.uniforms[this.textureID]) {

            this.uniforms[this.textureID].value = readBuffer.texture;

        }

        this.quad.material = this.material;

        if (this.renderToScreen) {

            renderer.render(this.scene, this.camera);

        } else {

            renderer.render(this.scene, this.camera, writeBuffer, this.clear);

        }

    }

});
