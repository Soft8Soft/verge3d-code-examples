/*
    three.js Ocean
*/

v3d.Ocean = function(renderer, camera, scene, options) {

    // flag used to trigger parameter changes
    this.changed = true;
    this.initial = true;

    // Assign required parameters as object properties
    this.oceanCamera = new v3d.OrthographicCamera(); //camera.clone();
    this.oceanCamera.position.z = 1;
    this.renderer = renderer;
    this.renderer.clearColor(0xffffff);

    this.scene = new v3d.Scene();

    // Assign optional parameters as variables and object properties
    function optionalParameter(value, defaultValue) {

        return value !== undefined ? value : defaultValue;

    }
    options = options || {};
    this.clearColor = optionalParameter(options.CLEAR_COLOR, [1.0, 1.0, 1.0, 0.0]);
    this.geometryOrigin = optionalParameter(options.GEOMETRY_ORIGIN, [- 1000.0, - 1000.0]);
    this.sunDirectionX = optionalParameter(options.SUN_DIRECTION[0], - 1.0);
    this.sunDirectionY = optionalParameter(options.SUN_DIRECTION[1], 1.0);
    this.sunDirectionZ = optionalParameter(options.SUN_DIRECTION[2], 1.0);
    this.oceanColor = optionalParameter(options.OCEAN_COLOR, new v3d.Vector3(0.004, 0.016, 0.047));
    this.skyColor = optionalParameter(options.SKY_COLOR, new v3d.Vector3(3.2, 9.6, 12.8));
    this.exposure = optionalParameter(options.EXPOSURE, 0.35);
    this.geometryResolution = optionalParameter(options.GEOMETRY_RESOLUTION, 32);
    this.geometrySize = optionalParameter(options.GEOMETRY_SIZE, 2000);
    this.resolution = optionalParameter(options.RESOLUTION, 64);
    this.floatSize = optionalParameter(options.SIZE_OF_FLOAT, 4);
    this.windX = optionalParameter(options.INITIAL_WIND[0], 10.0);
    this.windY = optionalParameter(options.INITIAL_WIND[1], 10.0);
    this.size = optionalParameter(options.INITIAL_SIZE, 250.0);
    this.choppiness = optionalParameter(options.INITIAL_CHOPPINESS, 1.5);

    //
    this.matrixNeedsUpdate = false;

    // Setup framebuffer pipeline
    var renderTargetType = optionalParameter(options.USE_HALF_FLOAT, false) ? v3d.HalfFloatType : v3d.FloatType;
    var LinearClampParams = {
        minFilter: v3d.LinearFilter,
        magFilter: v3d.LinearFilter,
        wrapS: v3d.ClampToEdgeWrapping,
        wrapT: v3d.ClampToEdgeWrapping,
        format: v3d.RGBAFormat,
        stencilBuffer: false,
        depthBuffer: false,
        premultiplyAlpha: false,
        type: renderTargetType
    };
    var NearestClampParams = {
        minFilter: v3d.NearestFilter,
        magFilter: v3d.NearestFilter,
        wrapS: v3d.ClampToEdgeWrapping,
        wrapT: v3d.ClampToEdgeWrapping,
        format: v3d.RGBAFormat,
        stencilBuffer: false,
        depthBuffer: false,
        premultiplyAlpha: false,
        type: renderTargetType
    };
    var NearestRepeatParams = {
        minFilter: v3d.NearestFilter,
        magFilter: v3d.NearestFilter,
        wrapS: v3d.RepeatWrapping,
        wrapT: v3d.RepeatWrapping,
        format: v3d.RGBAFormat,
        stencilBuffer: false,
        depthBuffer: false,
        premultiplyAlpha: false,
        type: renderTargetType
    };
    this.initialSpectrumFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, NearestRepeatParams);
    this.spectrumFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, NearestClampParams);
    this.pingPhaseFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, NearestClampParams);
    this.pongPhaseFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, NearestClampParams);
    this.pingTransformFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, NearestClampParams);
    this.pongTransformFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, NearestClampParams);
    this.displacementMapFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, LinearClampParams);
    this.normalMapFramebuffer = new v3d.WebGLRenderTarget(this.resolution, this.resolution, LinearClampParams);

    // Define shaders and constant uniforms
    ////////////////////////////////////////

    // 0 - The vertex shader used in all of the simulation steps
    var fullscreeenVertexShader = v3d.OceanShaders["ocean_sim_vertex"];

    // 1 - Horizontal wave vertices used for FFT
    var oceanHorizontalShader = v3d.OceanShaders["ocean_subtransform"];
    var oceanHorizontalUniforms = v3d.UniformsUtils.clone(oceanHorizontalShader.uniforms);
    this.materialOceanHorizontal = new v3d.ShaderMaterial({
        uniforms: oceanHorizontalUniforms,
        vertexShader: fullscreeenVertexShader.vertexShader,
        fragmentShader: "#define HORIZONTAL \n" + oceanHorizontalShader.fragmentShader
    });
    this.materialOceanHorizontal.uniforms.u_transformSize = { value: this.resolution };
    this.materialOceanHorizontal.uniforms.u_subtransformSize = { value: null };
    this.materialOceanHorizontal.uniforms.u_input = { value: null };
    this.materialOceanHorizontal.depthTest = false;

    // 2 - Vertical wave vertices used for FFT
    var oceanVerticalShader = v3d.OceanShaders["ocean_subtransform"];
    var oceanVerticalUniforms = v3d.UniformsUtils.clone(oceanVerticalShader.uniforms);
    this.materialOceanVertical = new v3d.ShaderMaterial({
        uniforms: oceanVerticalUniforms,
        vertexShader: fullscreeenVertexShader.vertexShader,
        fragmentShader: oceanVerticalShader.fragmentShader
    });
    this.materialOceanVertical.uniforms.u_transformSize = { value: this.resolution };
    this.materialOceanVertical.uniforms.u_subtransformSize = { value: null };
    this.materialOceanVertical.uniforms.u_input = { value: null };
    this.materialOceanVertical.depthTest = false;

    // 3 - Initial spectrum used to generate height map
    var initialSpectrumShader = v3d.OceanShaders["ocean_initial_spectrum"];
    var initialSpectrumUniforms = v3d.UniformsUtils.clone(initialSpectrumShader.uniforms);
    this.materialInitialSpectrum = new v3d.ShaderMaterial({
        uniforms: initialSpectrumUniforms,
        vertexShader: initialSpectrumShader.vertexShader,
        fragmentShader: initialSpectrumShader.fragmentShader
    });
    this.materialInitialSpectrum.uniforms.u_wind = { value: new v3d.Vector2() };
    this.materialInitialSpectrum.uniforms.u_resolution = { value: this.resolution };
    this.materialInitialSpectrum.depthTest = false;

    // 4 - Phases used to animate heightmap
    var phaseShader = v3d.OceanShaders["ocean_phase"];
    var phaseUniforms = v3d.UniformsUtils.clone(phaseShader.uniforms);
    this.materialPhase = new v3d.ShaderMaterial({
        uniforms: phaseUniforms,
        vertexShader: fullscreeenVertexShader.vertexShader,
        fragmentShader: phaseShader.fragmentShader
    });
    this.materialPhase.uniforms.u_resolution = { value: this.resolution };
    this.materialPhase.depthTest = false;

    // 5 - Shader used to update spectrum
    var spectrumShader = v3d.OceanShaders["ocean_spectrum"];
    var spectrumUniforms = v3d.UniformsUtils.clone(spectrumShader.uniforms);
    this.materialSpectrum = new v3d.ShaderMaterial({
        uniforms: spectrumUniforms,
        vertexShader: fullscreeenVertexShader.vertexShader,
        fragmentShader: spectrumShader.fragmentShader
    });
    this.materialSpectrum.uniforms.u_initialSpectrum = { value: null };
    this.materialSpectrum.uniforms.u_resolution = { value: this.resolution };
    this.materialSpectrum.depthTest = false;

    // 6 - Shader used to update spectrum normals
    var normalShader = v3d.OceanShaders["ocean_normals"];
    var normalUniforms = v3d.UniformsUtils.clone(normalShader.uniforms);
    this.materialNormal = new v3d.ShaderMaterial({
        uniforms: normalUniforms,
        vertexShader: fullscreeenVertexShader.vertexShader,
        fragmentShader: normalShader.fragmentShader
    });
    this.materialNormal.uniforms.u_displacementMap = { value: null };
    this.materialNormal.uniforms.u_resolution = { value: this.resolution };
    this.materialNormal.depthTest = false;

    // 7 - Shader used to update normals
    var oceanShader = v3d.OceanShaders["ocean_main"];
    var oceanUniforms = v3d.UniformsUtils.clone(oceanShader.uniforms);
    this.materialOcean = new v3d.ShaderMaterial({
        uniforms: oceanUniforms,
        vertexShader: oceanShader.vertexShader,
        fragmentShader: oceanShader.fragmentShader
    });
    // this.materialOcean.wireframe = true;
    this.materialOcean.uniforms.u_geometrySize = { value: this.resolution };
    this.materialOcean.uniforms.u_displacementMap = { value: this.displacementMapFramebuffer.texture };
    this.materialOcean.uniforms.u_normalMap = { value: this.normalMapFramebuffer.texture };
    this.materialOcean.uniforms.u_oceanColor = { value: this.oceanColor };
    this.materialOcean.uniforms.u_skyColor = { value: this.skyColor };
    this.materialOcean.uniforms.u_sunDirection = { value: new v3d.Vector3(this.sunDirectionX, this.sunDirectionY, this.sunDirectionZ) };
    this.materialOcean.uniforms.u_exposure = { value: this.exposure };

    // Disable blending to prevent default premultiplied alpha values
    this.materialOceanHorizontal.blending = 0;
    this.materialOceanVertical.blending = 0;
    this.materialInitialSpectrum.blending = 0;
    this.materialPhase.blending = 0;
    this.materialSpectrum.blending = 0;
    this.materialNormal.blending = 0;
    this.materialOcean.blending = 0;

    // Create the simulation plane
    this.screenQuad = new v3d.Mesh(new v3d.PlaneBufferGeometry(2, 2));
    this.scene.add(this.screenQuad);

    // Initialise spectrum data
    this.generateSeedPhaseTexture();

    // Generate the ocean mesh
    this.generateMesh();

};

v3d.Ocean.prototype.generateMesh = function() {

    var geometry = new v3d.PlaneBufferGeometry(this.geometrySize, this.geometrySize, this.geometryResolution, this.geometryResolution);

    geometry.rotateX(- Math.PI / 2);

    this.oceanMesh = new v3d.Mesh(geometry, this.materialOcean);

};

v3d.Ocean.prototype.render = function() {

    var currentRenderTarget = this.renderer.getRenderTarget();

    this.scene.overrideMaterial = null;

    if (this.changed)
        this.renderInitialSpectrum();

    this.renderWavePhase();
    this.renderSpectrum();
    this.renderSpectrumFFT();
    this.renderNormalMap();
    this.scene.overrideMaterial = null;

    this.renderer.setRenderTarget(currentRenderTarget);

};

v3d.Ocean.prototype.generateSeedPhaseTexture = function() {

    // Setup the seed texture
    this.pingPhase = true;
    var phaseArray = new window.Float32Array(this.resolution * this.resolution * 4);
    for (var i = 0; i < this.resolution; i++) {

        for (var j = 0; j < this.resolution; j ++) {

            phaseArray[i * this.resolution * 4 + j * 4] = Math.random() * 2.0 * Math.PI;
            phaseArray[i * this.resolution * 4 + j * 4 + 1] = 0.0;
            phaseArray[i * this.resolution * 4 + j * 4 + 2] = 0.0;
            phaseArray[i * this.resolution * 4 + j * 4 + 3] = 0.0;

        }

    }

    this.pingPhaseTexture = new v3d.DataTexture(phaseArray, this.resolution, this.resolution, v3d.RGBAFormat);
    this.pingPhaseTexture.wrapS = v3d.ClampToEdgeWrapping;
    this.pingPhaseTexture.wrapT = v3d.ClampToEdgeWrapping;
    this.pingPhaseTexture.type = v3d.FloatType;

};

v3d.Ocean.prototype.renderInitialSpectrum = function() {

    this.scene.overrideMaterial = this.materialInitialSpectrum;
    this.materialInitialSpectrum.uniforms.u_wind.value.set(this.windX, this.windY);
    this.materialInitialSpectrum.uniforms.u_size.value = this.size;

    this.renderer.setRenderTarget(this.initialSpectrumFramebuffer);
    this.renderer.clear();
    this.renderer.render(this.scene, this.oceanCamera);

};

v3d.Ocean.prototype.renderWavePhase = function() {

    this.scene.overrideMaterial = this.materialPhase;
    this.screenQuad.material = this.materialPhase;
    if (this.initial) {

        this.materialPhase.uniforms.u_phases.value = this.pingPhaseTexture;
        this.initial = false;

    } else {

        this.materialPhase.uniforms.u_phases.value = this.pingPhase ? this.pingPhaseFramebuffer.texture : this.pongPhaseFramebuffer.texture;

    }
    this.materialPhase.uniforms.u_deltaTime.value = this.deltaTime;
    this.materialPhase.uniforms.u_size.value = this.size;
    this.renderer.setRenderTarget(this.pingPhase ? this.pongPhaseFramebuffer : this.pingPhaseFramebuffer);
    this.renderer.render(this.scene, this.oceanCamera);
    this.pingPhase = ! this.pingPhase;

};

v3d.Ocean.prototype.renderSpectrum = function() {

    this.scene.overrideMaterial = this.materialSpectrum;
    this.materialSpectrum.uniforms.u_initialSpectrum.value = this.initialSpectrumFramebuffer.texture;
    this.materialSpectrum.uniforms.u_phases.value = this.pingPhase ? this.pingPhaseFramebuffer.texture : this.pongPhaseFramebuffer.texture;
    this.materialSpectrum.uniforms.u_choppiness.value = this.choppiness;
    this.materialSpectrum.uniforms.u_size.value = this.size;

    this.renderer.setRenderTarget(this.spectrumFramebuffer);
    this.renderer.render(this.scene, this.oceanCamera);

};

v3d.Ocean.prototype.renderSpectrumFFT = function() {

    // GPU FFT using Stockham formulation
    var iterations = Math.log(this.resolution) / Math.log(2); // log2

    this.scene.overrideMaterial = this.materialOceanHorizontal;

    for (var i = 0; i < iterations; i++) {

        if (i === 0) {

            this.materialOceanHorizontal.uniforms.u_input.value = this.spectrumFramebuffer.texture;
            this.materialOceanHorizontal.uniforms.u_subtransformSize.value = Math.pow(2, (i % (iterations)) + 1);

            this.renderer.setRenderTarget(this.pingTransformFramebuffer);
            this.renderer.render(this.scene, this.oceanCamera);

        } else if (i % 2 === 1) {

            this.materialOceanHorizontal.uniforms.u_input.value = this.pingTransformFramebuffer.texture;
            this.materialOceanHorizontal.uniforms.u_subtransformSize.value = Math.pow(2, (i % (iterations)) + 1);

            this.renderer.setRenderTarget(this.pongTransformFramebuffer);
            this.renderer.render(this.scene, this.oceanCamera);

        } else {

            this.materialOceanHorizontal.uniforms.u_input.value = this.pongTransformFramebuffer.texture;
            this.materialOceanHorizontal.uniforms.u_subtransformSize.value = Math.pow(2, (i % (iterations)) + 1);

            this.renderer.setRenderTarget(this.pingTransformFramebuffer);
            this.renderer.render(this.scene, this.oceanCamera);

        }

    }
    this.scene.overrideMaterial = this.materialOceanVertical;
    for (var i = iterations; i < iterations * 2; i++) {

        if (i === iterations * 2 - 1) {

            this.materialOceanVertical.uniforms.u_input.value = (iterations % 2 === 0) ? this.pingTransformFramebuffer.texture : this.pongTransformFramebuffer.texture;
            this.materialOceanVertical.uniforms.u_subtransformSize.value = Math.pow(2, (i % (iterations)) + 1);

            this.renderer.setRenderTarget(this.displacementMapFramebuffer);
            this.renderer.render(this.scene, this.oceanCamera);

        } else if (i % 2 === 1) {

            this.materialOceanVertical.uniforms.u_input.value = this.pingTransformFramebuffer.texture;
            this.materialOceanVertical.uniforms.u_subtransformSize.value = Math.pow(2, (i % (iterations)) + 1);

            this.renderer.setRenderTarget(this.pongTransformFramebuffer);
            this.renderer.render(this.scene, this.oceanCamera);

        } else {

            this.materialOceanVertical.uniforms.u_input.value = this.pongTransformFramebuffer.texture;
            this.materialOceanVertical.uniforms.u_subtransformSize.value = Math.pow(2, (i % (iterations)) + 1);

            this.renderer.setRenderTarget(this.pingTransformFramebuffer);
            this.renderer.render(this.scene, this.oceanCamera);

        }

    }

};

v3d.Ocean.prototype.renderNormalMap = function() {

    this.scene.overrideMaterial = this.materialNormal;
    if (this.changed) this.materialNormal.uniforms.u_size.value = this.size;
    this.materialNormal.uniforms.u_displacementMap.value = this.displacementMapFramebuffer.texture;

    this.renderer.setRenderTarget(this.normalMapFramebuffer);
    this.renderer.clear();
    this.renderer.render(this.scene, this.oceanCamera);

};
