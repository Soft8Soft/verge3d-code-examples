/**
 * Depth-of-field post-process with bokeh shader
 */

v3d.BokehPass = function(scene, camera, params) {

    v3d.Pass.call(this);

    this.scene = scene;
    this.camera = camera;

    var focus = (params.focus !== undefined) ? params.focus : 1.0;
    var aspect = (params.aspect !== undefined) ? params.aspect : camera.aspect;
    var aperture = (params.aperture !== undefined) ? params.aperture : 0.025;
    var maxblur = (params.maxblur !== undefined) ? params.maxblur : 1.0;

    // render targets

    var width = params.width || window.innerWidth || 1;
    var height = params.height || window.innerHeight || 1;

    this.renderTargetColor = new v3d.WebGLRenderTarget(width, height, {
        minFilter: v3d.LinearFilter,
        magFilter: v3d.LinearFilter,
        format: v3d.RGBFormat
    });
    this.renderTargetColor.texture.name = "BokehPass.color";

    this.renderTargetDepth = this.renderTargetColor.clone();
    this.renderTargetDepth.texture.name = "BokehPass.depth";

    // depth material

    this.materialDepth = new v3d.MeshDepthMaterial();
    this.materialDepth.depthPacking = v3d.RGBADepthPacking;
    this.materialDepth.blending = v3d.NoBlending;

    // bokeh material

    if (v3d.BokehShader === undefined) {

        console.error("v3d.BokehPass relies on v3d.BokehShader");

    }

    var bokehShader = v3d.BokehShader;
    var bokehUniforms = v3d.UniformsUtils.clone(bokehShader.uniforms);

    bokehUniforms["tDepth"].value = this.renderTargetDepth.texture;

    bokehUniforms["focus"].value = focus;
    bokehUniforms["aspect"].value = aspect;
    bokehUniforms["aperture"].value = aperture;
    bokehUniforms["maxblur"].value = maxblur;
    bokehUniforms["nearClip"].value = camera.near;
    bokehUniforms["farClip"].value = camera.far;

    this.materialBokeh = new v3d.ShaderMaterial({
        defines: Object.assign({}, bokehShader.defines),
        uniforms: bokehUniforms,
        vertexShader: bokehShader.vertexShader,
        fragmentShader: bokehShader.fragmentShader
    });

    this.uniforms = bokehUniforms;
    this.needsSwap = false;

    this.fsQuad = new v3d.Pass.FullScreenQuad(this.materialBokeh);

    this.oldClearColor = new v3d.Color();

};

v3d.BokehPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.BokehPass,

    render: function(renderer, writeBuffer, readBuffer/*, deltaTime, maskActive*/) {

        // Render depth into texture

        this.scene.overrideMaterial = this.materialDepth;

        this.oldClearColor.copy(renderer.getClearColor());
        var oldClearAlpha = renderer.getClearAlpha();
        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        renderer.setClearColor(0xffffff);
        renderer.setClearAlpha(1.0);
        renderer.setRenderTarget(this.renderTargetDepth);
        renderer.clear();
        renderer.render(this.scene, this.camera);

        // Render bokeh composite

        this.uniforms["tColor"].value = readBuffer.texture;
        this.uniforms["nearClip"].value = this.camera.near;
        this.uniforms["farClip"].value = this.camera.far;

        if (this.renderToScreen) {

            renderer.setRenderTarget(null);
            this.fsQuad.render(renderer);

        } else {

            renderer.setRenderTarget(writeBuffer);
            renderer.clear();
            this.fsQuad.render(renderer);

        }

        this.scene.overrideMaterial = null;
        renderer.setClearColor(this.oldClearColor);
        renderer.setClearAlpha(oldClearAlpha);
        renderer.autoClear = oldAutoClear;

    }

});
