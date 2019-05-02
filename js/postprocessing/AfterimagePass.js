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

    this.compFsQuad = new v3d.Pass.FullScreenQuad(this.shaderMaterial);

    var material = new v3d.MeshBasicMaterial();
    this.copyFsQuad = new v3d.Pass.FullScreenQuad(material);

};

v3d.AfterimagePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.AfterimagePass,

    render: function(renderer, writeBuffer, readBuffer) {

        this.uniforms["tOld"].value = this.textureOld.texture;
        this.uniforms["tNew"].value = readBuffer.texture;

        renderer.setRenderTarget(this.textureComp);
        this.compFsQuad.render(renderer);

        this.copyFsQuad.material.map = this.textureComp.texture;

        if (this.renderToScreen) {

            renderer.setRenderTarget(null);
            this.copyFsQuad.render(renderer);

        } else {

            renderer.setRenderTarget(writeBuffer);

            if (this.clear) renderer.clear();

            this.copyFsQuad.render(renderer);

        }

        // Swap buffers.
        var temp = this.textureOld;
        this.textureOld = this.textureComp;
        this.textureComp = temp;
        // Now textureOld contains the latest image, ready for the next frame.

    },

    setSize: function(width, height) {

        this.textureComp.setSize(width, height);
        this.textureOld.setSize(width, height);

    }

});
