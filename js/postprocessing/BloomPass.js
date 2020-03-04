/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.BloomPass = function(strength, kernelSize, sigma, resolution) {

    v3d.Pass.call(this);

    strength = (strength !== undefined) ? strength : 1;
    kernelSize = (kernelSize !== undefined) ? kernelSize : 25;
    sigma = (sigma !== undefined) ? sigma : 4.0;
    resolution = (resolution !== undefined) ? resolution : 256;

    // render targets

    var pars = { minFilter: v3d.LinearFilter, magFilter: v3d.LinearFilter, format: v3d.RGBAFormat };

    this.renderTargetX = new v3d.WebGLRenderTarget(resolution, resolution, pars);
    this.renderTargetX.texture.name = "BloomPass.x";
    this.renderTargetY = new v3d.WebGLRenderTarget(resolution, resolution, pars);
    this.renderTargetY.texture.name = "BloomPass.y";

    // copy material

    if (v3d.CopyShader === undefined)
        console.error("v3d.BloomPass relies on v3d.CopyShader");

    var copyShader = v3d.CopyShader;

    this.copyUniforms = v3d.UniformsUtils.clone(copyShader.uniforms);

    this.copyUniforms["opacity"].value = strength;

    this.materialCopy = new v3d.ShaderMaterial({

        uniforms: this.copyUniforms,
        vertexShader: copyShader.vertexShader,
        fragmentShader: copyShader.fragmentShader,
        blending: v3d.AdditiveBlending,
        transparent: true

    });

    // convolution material

    if (v3d.ConvolutionShader === undefined)
        console.error("v3d.BloomPass relies on v3d.ConvolutionShader");

    var convolutionShader = v3d.ConvolutionShader;

    this.convolutionUniforms = v3d.UniformsUtils.clone(convolutionShader.uniforms);

    this.convolutionUniforms["uImageIncrement"].value = v3d.BloomPass.blurX;
    this.convolutionUniforms["cKernel"].value = v3d.ConvolutionShader.buildKernel(sigma);

    this.materialConvolution = new v3d.ShaderMaterial({

        uniforms: this.convolutionUniforms,
        vertexShader: convolutionShader.vertexShader,
        fragmentShader: convolutionShader.fragmentShader,
        defines: {
            "KERNEL_SIZE_FLOAT": kernelSize.toFixed(1),
            "KERNEL_SIZE_INT": kernelSize.toFixed(0)
        }

    });

    this.needsSwap = false;

    this.fsQuad = new v3d.Pass.FullScreenQuad(null);

};

v3d.BloomPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.BloomPass,

    render: function(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {

        if (maskActive) renderer.state.buffers.stencil.setTest(false);

        // Render quad with blured scene into texture (convolution pass 1)

        this.fsQuad.material = this.materialConvolution;

        this.convolutionUniforms["tDiffuse"].value = readBuffer.texture;
        this.convolutionUniforms["uImageIncrement"].value = v3d.BloomPass.blurX;

        renderer.setRenderTarget(this.renderTargetX);
        renderer.clear();
        this.fsQuad.render(renderer);


        // Render quad with blured scene into texture (convolution pass 2)

        this.convolutionUniforms["tDiffuse"].value = this.renderTargetX.texture;
        this.convolutionUniforms["uImageIncrement"].value = v3d.BloomPass.blurY;

        renderer.setRenderTarget(this.renderTargetY);
        renderer.clear();
        this.fsQuad.render(renderer);

        // Render original scene with superimposed blur to texture

        this.fsQuad.material = this.materialCopy;

        this.copyUniforms["tDiffuse"].value = this.renderTargetY.texture;

        if (maskActive) renderer.state.buffers.stencil.setTest(true);

        renderer.setRenderTarget(readBuffer);
        if (this.clear) renderer.clear();
        this.fsQuad.render(renderer);

    }

});

v3d.BloomPass.blurX = new v3d.Vector2(0.001953125, 0.0);
v3d.BloomPass.blurY = new v3d.Vector2(0.0, 0.001953125);
