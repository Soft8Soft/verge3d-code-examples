(function() {

    class AfterimagePass extends v3d.Pass {

        constructor(damp = 0.96) {

            super();
            if (v3d.AfterimageShader === undefined) console.error('v3d.AfterimagePass relies on v3d.AfterimageShader');
            this.shader = v3d.AfterimageShader;
            this.uniforms = v3d.UniformsUtils.clone(this.shader.uniforms);
            this.uniforms['damp'].value = damp;
            this.textureComp = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
                minFilter: v3d.LinearFilter,
                magFilter: v3d.NearestFilter,
                format: v3d.RGBAFormat
            });
            this.textureOld = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
                minFilter: v3d.LinearFilter,
                magFilter: v3d.NearestFilter,
                format: v3d.RGBAFormat
            });
            this.shaderMaterial = new v3d.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: this.shader.vertexShader,
                fragmentShader: this.shader.fragmentShader
            });
            this.compFsQuad = new v3d.FullScreenQuad(this.shaderMaterial);
            const material = new v3d.MeshBasicMaterial();
            this.copyFsQuad = new v3d.FullScreenQuad(material);

        }

        render(renderer, writeBuffer, readBuffer
            /*, deltaTime, maskActive*/
        ) {

            this.uniforms['tOld'].value = this.textureOld.texture;
            this.uniforms['tNew'].value = readBuffer.texture;
            renderer.setRenderTarget(this.textureComp);
            this.compFsQuad.render(renderer);
            this.copyFsQuad.material.map = this.textureComp.texture;

            if (this.renderToScreen) {

                renderer.setRenderTarget(null);
                this.copyFsQuad.render(renderer);

            } else {

                renderer.setRenderTarget(writeBuffer);
                if (this.clear) renderer.clear();
                this.copyFsQuad.render(renderer);

            } // Swap buffers.


            const temp = this.textureOld;
            this.textureOld = this.textureComp;
            this.textureComp = temp; // Now textureOld contains the latest image, ready for the next frame.

        }

        setSize(width, height) {

            this.textureComp.setSize(width, height);
            this.textureOld.setSize(width, height);

        }

    }

    v3d.AfterimagePass = AfterimagePass;

})();
