/**
 * @author Mugen87 / https://github.com/Mugen87
 */

v3d.SSAOPass = function(scene, camera, width, height) {

    v3d.Pass.call(this);

    this.width = (width !== undefined) ? width : 512;
    this.height = (height !== undefined) ? height : 512;

    this.clear = true;

    this.camera = camera;
    this.scene = scene;

    this.kernelRadius = 8;
    this.kernelSize = 32;
    this.kernel = [];
    this.noiseTexture = null;
    this.output = 0;

    this.minDistance = 0.005;
    this.maxDistance = 0.1;

    //

    this.generateSampleKernel();
    this.generateRandomKernelRotations();

    // beauty render target with depth buffer

    var depthTexture = new v3d.DepthTexture();
    depthTexture.type = v3d.UnsignedShortType;
    depthTexture.minFilter = v3d.NearestFilter;
    depthTexture.maxFilter = v3d.NearestFilter;

    this.beautyRenderTarget = new v3d.WebGLRenderTarget(this.width, this.height, {
        minFilter: v3d.LinearFilter,
        magFilter: v3d.LinearFilter,
        format: v3d.RGBAFormat,
        depthTexture: depthTexture,
        depthBuffer: true
    });

    // normal render target

    this.normalRenderTarget = new v3d.WebGLRenderTarget(this.width, this.height, {
        minFilter: v3d.NearestFilter,
        magFilter: v3d.NearestFilter,
        format: v3d.RGBAFormat
    });

    // ssao render target

    this.ssaoRenderTarget = new v3d.WebGLRenderTarget(this.width, this.height, {
        minFilter: v3d.LinearFilter,
        magFilter: v3d.LinearFilter,
        format: v3d.RGBAFormat
    });

    this.blurRenderTarget = this.ssaoRenderTarget.clone();

    // ssao material

    if (v3d.SSAOShader === undefined) {

        console.error('v3d.SSAOPass: The pass relies on v3d.SSAOShader.');

    }

    this.ssaoMaterial = new v3d.ShaderMaterial({
        defines: Object.assign({}, v3d.SSAOShader.defines),
        uniforms: v3d.UniformsUtils.clone(v3d.SSAOShader.uniforms),
        vertexShader: v3d.SSAOShader.vertexShader,
        fragmentShader: v3d.SSAOShader.fragmentShader,
        blending: v3d.NoBlending
    });

    this.ssaoMaterial.uniforms['tDiffuse'].value = this.beautyRenderTarget.texture;
    this.ssaoMaterial.uniforms['tNormal'].value = this.normalRenderTarget.texture;
    this.ssaoMaterial.uniforms['tDepth'].value = this.beautyRenderTarget.depthTexture;
    this.ssaoMaterial.uniforms['tNoise'].value = this.noiseTexture;
    this.ssaoMaterial.uniforms['kernel'].value = this.kernel;
    this.ssaoMaterial.uniforms['cameraNear'].value = this.camera.near;
    this.ssaoMaterial.uniforms['cameraFar'].value = this.camera.far;
    this.ssaoMaterial.uniforms['resolution'].value.set(this.width, this.height);
    this.ssaoMaterial.uniforms['cameraProjectionMatrix'].value.copy(this.camera.projectionMatrix);
    this.ssaoMaterial.uniforms['cameraInverseProjectionMatrix'].value.getInverse(this.camera.projectionMatrix);

    // normal material

    this.normalMaterial = new v3d.MeshNormalMaterial();
    this.normalMaterial.blending = v3d.NoBlending;

    // blur material

    this.blurMaterial = new v3d.ShaderMaterial({
        defines: Object.assign({}, v3d.SSAOBlurShader.defines),
        uniforms: v3d.UniformsUtils.clone(v3d.SSAOBlurShader.uniforms),
        vertexShader: v3d.SSAOBlurShader.vertexShader,
        fragmentShader: v3d.SSAOBlurShader.fragmentShader
    });
    this.blurMaterial.uniforms['tDiffuse'].value = this.ssaoRenderTarget.texture;
    this.blurMaterial.uniforms['resolution'].value.set(this.width, this.height);

    // material for rendering the depth

    this.depthRenderMaterial = new v3d.ShaderMaterial({
        defines: Object.assign({}, v3d.SSAODepthShader.defines),
        uniforms: v3d.UniformsUtils.clone(v3d.SSAODepthShader.uniforms),
        vertexShader: v3d.SSAODepthShader.vertexShader,
        fragmentShader: v3d.SSAODepthShader.fragmentShader,
        blending: v3d.NoBlending
    });
    this.depthRenderMaterial.uniforms['tDepth'].value = this.beautyRenderTarget.depthTexture;
    this.depthRenderMaterial.uniforms['cameraNear'].value = this.camera.near;
    this.depthRenderMaterial.uniforms['cameraFar'].value = this.camera.far;

    // material for rendering the content of a render target

    this.copyMaterial = new v3d.ShaderMaterial({
        uniforms: v3d.UniformsUtils.clone(v3d.CopyShader.uniforms),
        vertexShader: v3d.CopyShader.vertexShader,
        fragmentShader: v3d.CopyShader.fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blendSrc: v3d.DstColorFactor,
        blendDst: v3d.ZeroFactor,
        blendEquation: v3d.AddEquation,
        blendSrcAlpha: v3d.DstAlphaFactor,
        blendDstAlpha: v3d.ZeroFactor,
        blendEquationAlpha: v3d.AddEquation
    });

    this.fsQuad = new v3d.Pass.FullScreenQuad(null);

    this.originalClearColor = new v3d.Color();

};

v3d.SSAOPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.SSAOPass,

    dispose: function() {

        // dispose render targets

        this.beautyRenderTarget.dispose();
        this.normalRenderTarget.dispose();
        this.ssaoRenderTarget.dispose();
        this.blurRenderTarget.dispose();

        // dispose materials

        this.normalMaterial.dispose();
        this.blurMaterial.dispose();
        this.copyMaterial.dispose();
        this.depthRenderMaterial.dispose();

        // dipsose full screen quad

        this.fsQuad.dispose();

    },

    render: function(renderer, writeBuffer /*, readBuffer, deltaTime, maskActive */) {

        // render beauty and depth

        renderer.setRenderTarget(this.beautyRenderTarget);
        renderer.clear();
        renderer.render(this.scene, this.camera);

        // render normals

        this.renderOverride(renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0);

        // render SSAO

        this.ssaoMaterial.uniforms['kernelRadius'].value = this.kernelRadius;
        this.ssaoMaterial.uniforms['minDistance'].value = this.minDistance;
        this.ssaoMaterial.uniforms['maxDistance'].value = this.maxDistance;
        this.renderPass(renderer, this.ssaoMaterial, this.ssaoRenderTarget);

        // render blur

        this.renderPass(renderer, this.blurMaterial, this.blurRenderTarget);

        // output result to screen

        switch (this.output) {

            case v3d.SSAOPass.OUTPUT.SSAO:

                this.copyMaterial.uniforms['tDiffuse'].value = this.ssaoRenderTarget.texture;
                this.copyMaterial.blending = v3d.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case v3d.SSAOPass.OUTPUT.Blur:

                this.copyMaterial.uniforms['tDiffuse'].value = this.blurRenderTarget.texture;
                this.copyMaterial.blending = v3d.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case v3d.SSAOPass.OUTPUT.Beauty:

                this.copyMaterial.uniforms['tDiffuse'].value = this.beautyRenderTarget.texture;
                this.copyMaterial.blending = v3d.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case v3d.SSAOPass.OUTPUT.Depth:

                this.renderPass(renderer, this.depthRenderMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case v3d.SSAOPass.OUTPUT.Normal:

                this.copyMaterial.uniforms['tDiffuse'].value = this.normalRenderTarget.texture;
                this.copyMaterial.blending = v3d.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            case v3d.SSAOPass.OUTPUT.Default:

                this.copyMaterial.uniforms['tDiffuse'].value = this.beautyRenderTarget.texture;
                this.copyMaterial.blending = v3d.NoBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                this.copyMaterial.uniforms['tDiffuse'].value = this.blurRenderTarget.texture;
                this.copyMaterial.blending = v3d.CustomBlending;
                this.renderPass(renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer);

                break;

            default:
                console.warn('v3d.SSAOPass: Unknown output type.');

        }

    },

    renderPass: function(renderer, passMaterial, renderTarget, clearColor, clearAlpha) {

        // save original state
        this.originalClearColor.copy(renderer.getClearColor());
        var originalClearAlpha = renderer.getClearAlpha();
        var originalAutoClear = renderer.autoClear;

        renderer.setRenderTarget(renderTarget);

        // setup pass state
        renderer.autoClear = false;
        if ((clearColor !== undefined) && (clearColor !== null)) {

            renderer.setClearColor(clearColor);
            renderer.setClearAlpha(clearAlpha || 0.0);
            renderer.clear();

        }

        this.fsQuad.material = passMaterial;
        this.fsQuad.render(renderer);

        // restore original state
        renderer.autoClear = originalAutoClear;
        renderer.setClearColor(this.originalClearColor);
        renderer.setClearAlpha(originalClearAlpha);

    },

    renderOverride: function(renderer, overrideMaterial, renderTarget, clearColor, clearAlpha) {

        this.originalClearColor.copy(renderer.getClearColor());
        var originalClearAlpha = renderer.getClearAlpha();
        var originalAutoClear = renderer.autoClear;

        renderer.setRenderTarget(renderTarget);
        renderer.autoClear = false;

        clearColor = overrideMaterial.clearColor || clearColor;
        clearAlpha = overrideMaterial.clearAlpha || clearAlpha;

        if ((clearColor !== undefined) && (clearColor !== null)) {

            renderer.setClearColor(clearColor);
            renderer.setClearAlpha(clearAlpha || 0.0);
            renderer.clear();

        }

        this.scene.overrideMaterial = overrideMaterial;
        renderer.render(this.scene, this.camera);
        this.scene.overrideMaterial = null;

        // restore original state

        renderer.autoClear = originalAutoClear;
        renderer.setClearColor(this.originalClearColor);
        renderer.setClearAlpha(originalClearAlpha);

    },

    setSize: function(width, height) {

        this.width = width;
        this.height = height;

        this.beautyRenderTarget.setSize(width, height);
        this.ssaoRenderTarget.setSize(width, height);
        this.normalRenderTarget.setSize(width, height);
        this.blurRenderTarget.setSize(width, height);

        this.ssaoMaterial.uniforms['resolution'].value.set(width, height);
        this.ssaoMaterial.uniforms['cameraProjectionMatrix'].value.copy(this.camera.projectionMatrix);
        this.ssaoMaterial.uniforms['cameraInverseProjectionMatrix'].value.getInverse(this.camera.projectionMatrix);

        this.blurMaterial.uniforms['resolution'].value.set(width, height);

    },

    generateSampleKernel: function() {

        var kernelSize = this.kernelSize;
        var kernel = this.kernel;

        for (var i = 0; i < kernelSize; i++) {

            var sample = new v3d.Vector3();
            sample.x = (Math.random() * 2) - 1;
            sample.y = (Math.random() * 2) - 1;
            sample.z = Math.random();

            sample.normalize();

            var scale = i / kernelSize;
            scale = v3d.MathUtils.lerp(0.1, 1, scale * scale);
            sample.multiplyScalar(scale);

            kernel.push(sample);

        }

    },

    generateRandomKernelRotations: function() {

        var width = 4, height = 4;

        if (v3d.SimplexNoise === undefined) {

            console.error('v3d.SSAOPass: The pass relies on v3d.SimplexNoise.');

        }

        var simplex = new v3d.SimplexNoise();

        var size = width * height;
        var data = new Float32Array(size * 4);

        for (var i = 0; i < size; i++) {

            var stride = i * 4;

            var x = (Math.random() * 2) - 1;
            var y = (Math.random() * 2) - 1;
            var z = 0;

            var noise = simplex.noise3d(x, y, z);

            data[stride] = noise;
            data[stride + 1] = noise;
            data[stride + 2] = noise;
            data[stride + 3] = 1;

        }

        this.noiseTexture = new v3d.DataTexture(data, width, height, v3d.RGBAFormat, v3d.FloatType);
        this.noiseTexture.wrapS = v3d.RepeatWrapping;
        this.noiseTexture.wrapT = v3d.RepeatWrapping;

    }

});

v3d.SSAOPass.OUTPUT = {
    'Default': 0,
    'SSAO': 1,
    'Blur': 2,
    'Beauty': 3,
    'Depth': 4,
    'Normal': 5
};
