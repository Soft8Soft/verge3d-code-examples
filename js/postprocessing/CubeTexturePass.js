/**
 * @author bhouston / http://clara.io/
 */

v3d.CubeTexturePass = function(camera, envMap, opacity) {

    v3d.Pass.call(this);

    this.camera = camera;

    this.needsSwap = false;

    this.cubeShader = v3d.ShaderLib['cube'];
    this.cubeMesh = new v3d.Mesh(
        new v3d.BoxBufferGeometry(10, 10, 10),
        new v3d.ShaderMaterial({
            uniforms: this.cubeShader.uniforms,
            vertexShader: this.cubeShader.vertexShader,
            fragmentShader: this.cubeShader.fragmentShader,
            depthTest: false,
            depthWrite: false,
            side: v3d.BackSide
        })
    );

    Object.defineProperty(this.cubeMesh.material, 'envMap', {

        get: function() {

            return this.uniforms.envMap.value;

        }

    });

    this.envMap = envMap;
    this.opacity = (opacity !== undefined) ? opacity : 1.0;

    this.cubeScene = new v3d.Scene();
    this.cubeCamera = new v3d.PerspectiveCamera();
    this.cubeScene.add(this.cubeMesh);

};

v3d.CubeTexturePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.CubeTexturePass,

    render: function(renderer, writeBuffer, readBuffer/*, deltaTime, maskActive*/) {

        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        this.cubeCamera.projectionMatrix.copy(this.camera.projectionMatrix);
        this.cubeCamera.quaternion.setFromRotationMatrix(this.camera.matrixWorld);

        this.cubeMesh.material.uniforms.envMap.value = this.envMap;
        this.cubeMesh.material.uniforms.opacity.value = this.opacity;
        this.cubeMesh.material.transparent = (this.opacity < 1.0);

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        if (this.clear) renderer.clear();
        renderer.render(this.cubeScene, this.cubeCamera);

        renderer.autoClear = oldAutoClear;

    }

});
