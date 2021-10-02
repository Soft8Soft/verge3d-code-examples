(function() {

    /**
 * RGB Halftone pass for three.js effects composer. Requires v3d.HalftoneShader.
 */

    class HalftonePass extends v3d.Pass {

        constructor(width, height, params) {

            super();

            if (v3d.HalftoneShader === undefined) {

                console.error('v3d.HalftonePass requires v3d.HalftoneShader');

            }

            this.uniforms = v3d.UniformsUtils.clone(v3d.HalftoneShader.uniforms);
            this.material = new v3d.ShaderMaterial({
                uniforms: this.uniforms,
                fragmentShader: v3d.HalftoneShader.fragmentShader,
                vertexShader: v3d.HalftoneShader.vertexShader
            }); // set params

            this.uniforms.width.value = width;
            this.uniforms.height.value = height;

            for (const key in params) {

                if (params.hasOwnProperty(key) && this.uniforms.hasOwnProperty(key)) {

                    this.uniforms[key].value = params[key];

                }

            }

            this.fsQuad = new v3d.FullScreenQuad(this.material);

        }

        render(renderer, writeBuffer, readBuffer
            /*, deltaTime, maskActive*/
        ) {

            this.material.uniforms['tDiffuse'].value = readBuffer.texture;

            if (this.renderToScreen) {

                renderer.setRenderTarget(null);
                this.fsQuad.render(renderer);

            } else {

                renderer.setRenderTarget(writeBuffer);
                if (this.clear) renderer.clear();
                this.fsQuad.render(renderer);

            }

        }

        setSize(width, height) {

            this.uniforms.width.value = width;
            this.uniforms.height.value = height;

        }

    }

    v3d.HalftonePass = HalftonePass;

})();
