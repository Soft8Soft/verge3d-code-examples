/**
 * @author mrdoob / http://mrdoob.com/
 */

v3d.ClearPass = function(clearColor, clearAlpha) {

    v3d.Pass.call(this);

    this.needsSwap = false;

    this.clearColor = (clearColor !== undefined) ? clearColor : 0x000000;
    this.clearAlpha = (clearAlpha !== undefined) ? clearAlpha : 0;

};

v3d.ClearPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.ClearPass,

    render: function(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

        var oldClearColor, oldClearAlpha;

        if (this.clearColor) {

            oldClearColor = renderer.getClearColor().getHex();
            oldClearAlpha = renderer.getClearAlpha();

            renderer.setClearColor(this.clearColor, this.clearAlpha);

        }

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        renderer.clear();

        if (this.clearColor) {

            renderer.setClearColor(oldClearColor, oldClearAlpha);

        }

    }

});
