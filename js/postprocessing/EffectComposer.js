/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.EffectComposer = function(renderer, renderTarget) {

    this.renderer = renderer;

    if (renderTarget === undefined) {

        var parameters = {
            minFilter: v3d.LinearFilter,
            magFilter: v3d.LinearFilter,
            format: v3d.RGBAFormat,
            stencilBuffer: false
        };

        var size = renderer.getDrawingBufferSize(new v3d.Vector2());
        renderTarget = new v3d.WebGLRenderTarget(size.width, size.height, parameters);
        renderTarget.texture.name = 'EffectComposer.rt1';

    }

    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    this.renderTarget2.texture.name = 'EffectComposer.rt2';

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

    this.renderToScreen = true;

    this.passes = [];

    // dependencies

    if (v3d.CopyShader === undefined) {

        console.error('v3d.EffectComposer relies on v3d.CopyShader');

    }

    if (v3d.ShaderPass === undefined) {

        console.error('v3d.EffectComposer relies on v3d.ShaderPass');

    }

    this.copyPass = new v3d.ShaderPass(v3d.CopyShader);

    this._previousFrameTime = Date.now();

};

Object.assign(v3d.EffectComposer.prototype, {

    swapBuffers: function() {

        var tmp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = tmp;

    },

    addPass: function(pass) {

        this.passes.push(pass);

        var size = this.renderer.getDrawingBufferSize(new v3d.Vector2());
        pass.setSize(size.width, size.height);

    },

    insertPass: function(pass, index) {

        this.passes.splice(index, 0, pass);

    },

    isLastEnabledPass: function(passIndex) {

        for (var i = passIndex + 1; i < this.passes.length; i++) {

            if (this.passes[i].enabled) {

                return false;

            }

        }

        return true;

    },

    render: function(deltaTime) {

        // deltaTime value is in seconds

        if (deltaTime === undefined) {

            deltaTime = (Date.now() - this._previousFrameTime) * 0.001;

        }

        this._previousFrameTime = Date.now();

        var currentRenderTarget = this.renderer.getRenderTarget();

        var maskActive = false;

        var pass, i, il = this.passes.length;

        for (i = 0; i < il; i++) {

            pass = this.passes[i];

            if (pass.enabled === false) continue;

            pass.renderToScreen = (this.renderToScreen && this.isLastEnabledPass(i));
            pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);

            if (pass.needsSwap) {

                if (maskActive) {

                    var context = this.renderer.context;

                    context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

                    this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);

                    context.stencilFunc(context.EQUAL, 1, 0xffffffff);

                }

                this.swapBuffers();

            }

            if (v3d.MaskPass !== undefined) {

                if (pass instanceof v3d.MaskPass) {

                    maskActive = true;

                } else if (pass instanceof v3d.ClearMaskPass) {

                    maskActive = false;

                }

            }

        }

        this.renderer.setRenderTarget(currentRenderTarget);

    },

    reset: function(renderTarget) {

        if (renderTarget === undefined) {

            var size = this.renderer.getDrawingBufferSize(new v3d.Vector2());

            renderTarget = this.renderTarget1.clone();
            renderTarget.setSize(size.width, size.height);

        }

        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
        this.renderTarget1 = renderTarget;
        this.renderTarget2 = renderTarget.clone();

        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;

    },

    setSize: function(width, height) {

        this.renderTarget1.setSize(width, height);
        this.renderTarget2.setSize(width, height);

        for (var i = 0; i < this.passes.length; i++) {

            this.passes[i].setSize(width, height);

        }

    }

});


v3d.Pass = function() {

    // if set to true, the pass is processed by the composer
    this.enabled = true;

    // if set to true, the pass indicates to swap read and write buffer after rendering
    this.needsSwap = true;

    // if set to true, the pass clears its buffer before rendering
    this.clear = false;

    // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
    this.renderToScreen = false;

};

Object.assign(v3d.Pass.prototype, {

    setSize: function(width, height) {},

    render: function(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {

        console.error('v3d.Pass: .render() must be implemented in derived pass.');

    }

});

// Helper for passes that need to fill the viewport with a single quad.
v3d.Pass.FullScreenQuad = (function() {

    var camera = new v3d.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    var geometry = new v3d.PlaneBufferGeometry(2, 2);

    var FullScreenQuad = function(material) {

        this._mesh = new v3d.Mesh(geometry, material);

    };

    Object.defineProperty(FullScreenQuad.prototype, 'material', {

        get: function() {

            return this._mesh.material;

        },

        set: function(value) {

            this._mesh.material = value;

        }

    });

    Object.assign(FullScreenQuad.prototype, {

        render: function(renderer) {

            renderer.render(this._mesh, camera);

        }

    });

    return FullScreenQuad;

})();
