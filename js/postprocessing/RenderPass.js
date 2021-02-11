v3d.RenderPass = function(scene, camera, overrideMaterial, clearColor, clearAlpha) {

    v3d.Pass.call(this);

    this.scene = scene;
    this.camera = camera;

    this.overrideMaterial = overrideMaterial;

    this.clearColor = clearColor;
    this.clearAlpha = (clearAlpha !== undefined) ? clearAlpha : 0;

    this.clear = true;
    this.clearDepth = false;
    this.needsSwap = false;
    this._oldClearColor = new v3d.Color();

};

v3d.RenderPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.RenderPass,

    render: function(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

        var oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        var oldClearAlpha, oldOverrideMaterial;

        if (this.overrideMaterial !== undefined) {

            oldOverrideMaterial = this.scene.overrideMaterial;

            this.scene.overrideMaterial = this.overrideMaterial;

        }

        if (this.clearColor) {

            renderer.getClearColor(this._oldClearColor);
            oldClearAlpha = renderer.getClearAlpha();

            renderer.setClearColor(this.clearColor, this.clearAlpha);

        }

        if (this.clearDepth) {

            renderer.clearDepth();

        }

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);

        // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
        if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
        renderer.render(this.scene, this.camera);

        if (this.clearColor) {

            renderer.setClearColor(this._oldClearColor, oldClearAlpha);

        }

        if (this.overrideMaterial !== undefined) {

            this.scene.overrideMaterial = oldOverrideMaterial;

        }

        renderer.autoClear = oldAutoClear;

    }

});
