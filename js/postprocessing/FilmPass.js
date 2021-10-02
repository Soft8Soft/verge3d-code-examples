(function() {

    class FilmPass extends v3d.Pass {

        constructor(noiseIntensity, scanlinesIntensity, scanlinesCount, grayscale) {

            super();
            if (v3d.FilmShader === undefined) console.error('v3d.FilmPass relies on v3d.FilmShader');
            const shader = v3d.FilmShader;
            this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);
            this.material = new v3d.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader
            });
            if (grayscale !== undefined) this.uniforms.grayscale.value = grayscale;
            if (noiseIntensity !== undefined) this.uniforms.nIntensity.value = noiseIntensity;
            if (scanlinesIntensity !== undefined) this.uniforms.sIntensity.value = scanlinesIntensity;
            if (scanlinesCount !== undefined) this.uniforms.sCount.value = scanlinesCount;
            this.fsQuad = new v3d.FullScreenQuad(this.material);

        }

        render(renderer, writeBuffer, readBuffer, deltaTime
            /*, maskActive */
        ) {

            this.uniforms['tDiffuse'].value = readBuffer.texture;
            this.uniforms['time'].value += deltaTime;

            if (this.renderToScreen) {

                renderer.setRenderTarget(null);
                this.fsQuad.render(renderer);

            } else {

                renderer.setRenderTarget(writeBuffer);
                if (this.clear) renderer.clear();
                this.fsQuad.render(renderer);

            }

        }

    }

    v3d.FilmPass = FilmPass;

})();
