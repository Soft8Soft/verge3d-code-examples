(function() {

    class SavePass extends v3d.Pass {

        constructor(renderTarget) {

            super();
            if (v3d.CopyShader === undefined) console.error('v3d.SavePass relies on v3d.CopyShader');
            const shader = v3d.CopyShader;
            this.textureID = 'tDiffuse';
            this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);
            this.material = new v3d.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader
            });
            this.renderTarget = renderTarget;

            if (this.renderTarget === undefined) {

                this.renderTarget = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
                    minFilter: v3d.LinearFilter,
                    magFilter: v3d.LinearFilter,
                    format: v3d.RGBFormat
                });
                this.renderTarget.texture.name = 'SavePass.rt';

            }

            this.needsSwap = false;
            this.fsQuad = new v3d.FullScreenQuad(this.material);

        }

        render(renderer, writeBuffer, readBuffer
            /*, deltaTime, maskActive */
        ) {

            if (this.uniforms[this.textureID]) {

                this.uniforms[this.textureID].value = readBuffer.texture;

            }

            renderer.setRenderTarget(this.renderTarget);
            if (this.clear) renderer.clear();
            this.fsQuad.render(renderer);

        }

    }

    v3d.SavePass = SavePass;

})();
