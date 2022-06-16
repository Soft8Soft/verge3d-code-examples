(function() {

    class GlitchPass extends v3d.Pass {

        constructor(dt_size = 64) {

            super();
            if (v3d.DigitalGlitch === undefined) console.error('v3d.GlitchPass relies on v3d.DigitalGlitch');
            const shader = v3d.DigitalGlitch;
            this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);
            this.uniforms['tDisp'].value = this.generateHeightmap(dt_size);
            this.material = new v3d.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader
            });
            this.fsQuad = new v3d.FullScreenQuad(this.material);
            this.goWild = false;
            this.curF = 0;
            this.generateTrigger();

        }

        render(renderer, writeBuffer, readBuffer
            /*, deltaTime, maskActive */
        ) {

            if (renderer.capabilities.isWebGL2 === false) this.uniforms['tDisp'].value.format = v3d.LuminanceFormat;
            this.uniforms['tDiffuse'].value = readBuffer.texture;
            this.uniforms['seed'].value = Math.random(); //default seeding

            this.uniforms['byp'].value = 0;

            if (this.curF % this.randX == 0 || this.goWild == true) {

                this.uniforms['amount'].value = Math.random() / 30;
                this.uniforms['angle'].value = v3d.MathUtils.randFloat(- Math.PI, Math.PI);
                this.uniforms['seed_x'].value = v3d.MathUtils.randFloat(- 1, 1);
                this.uniforms['seed_y'].value = v3d.MathUtils.randFloat(- 1, 1);
                this.uniforms['distortion_x'].value = v3d.MathUtils.randFloat(0, 1);
                this.uniforms['distortion_y'].value = v3d.MathUtils.randFloat(0, 1);
                this.curF = 0;
                this.generateTrigger();

            } else if (this.curF % this.randX < this.randX / 5) {

                this.uniforms['amount'].value = Math.random() / 90;
                this.uniforms['angle'].value = v3d.MathUtils.randFloat(- Math.PI, Math.PI);
                this.uniforms['distortion_x'].value = v3d.MathUtils.randFloat(0, 1);
                this.uniforms['distortion_y'].value = v3d.MathUtils.randFloat(0, 1);
                this.uniforms['seed_x'].value = v3d.MathUtils.randFloat(- 0.3, 0.3);
                this.uniforms['seed_y'].value = v3d.MathUtils.randFloat(- 0.3, 0.3);

            } else if (this.goWild == false) {

                this.uniforms['byp'].value = 1;

            }

            this.curF ++;

            if (this.renderToScreen) {

                renderer.setRenderTarget(null);
                this.fsQuad.render(renderer);

            } else {

                renderer.setRenderTarget(writeBuffer);
                if (this.clear) renderer.clear();
                this.fsQuad.render(renderer);

            }

        }

        generateTrigger() {

            this.randX = v3d.MathUtils.randInt(120, 240);

        }

        generateHeightmap(dt_size) {

            const data_arr = new Float32Array(dt_size * dt_size);
            const length = dt_size * dt_size;

            for (let i = 0; i < length; i++) {

                const val = v3d.MathUtils.randFloat(0, 1);
                data_arr[i] = val;

            }

            const texture = new v3d.DataTexture(data_arr, dt_size, dt_size, v3d.RedFormat, v3d.FloatType);
            texture.needsUpdate = true;
            return texture;

        }

    }

    v3d.GlitchPass = GlitchPass;

})();
