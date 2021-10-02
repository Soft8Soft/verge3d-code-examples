(function() {

    class BloomPass extends v3d.Pass {

        constructor(strength = 1, kernelSize = 25, sigma = 4, resolution = 256) {

            super(); // render targets

            const pars = {
                minFilter: v3d.LinearFilter,
                magFilter: v3d.LinearFilter,
                format: v3d.RGBAFormat
            };
            this.renderTargetX = new v3d.WebGLRenderTarget(resolution, resolution, pars);
            this.renderTargetX.texture.name = 'BloomPass.x';
            this.renderTargetY = new v3d.WebGLRenderTarget(resolution, resolution, pars);
            this.renderTargetY.texture.name = 'BloomPass.y'; // copy material

            if (v3d.CopyShader === undefined) console.error('v3d.BloomPass relies on v3d.CopyShader');
            const copyShader = v3d.CopyShader;
            this.copyUniforms = v3d.UniformsUtils.clone(copyShader.uniforms);
            this.copyUniforms['opacity'].value = strength;
            this.materialCopy = new v3d.ShaderMaterial({
                uniforms: this.copyUniforms,
                vertexShader: copyShader.vertexShader,
                fragmentShader: copyShader.fragmentShader,
                blending: v3d.AdditiveBlending,
                transparent: true
            }); // convolution material

            if (v3d.ConvolutionShader === undefined) console.error('v3d.BloomPass relies on v3d.ConvolutionShader');
            const convolutionShader = v3d.ConvolutionShader;
            this.convolutionUniforms = v3d.UniformsUtils.clone(convolutionShader.uniforms);
            this.convolutionUniforms['uImageIncrement'].value = BloomPass.blurX;
            this.convolutionUniforms['cKernel'].value = v3d.ConvolutionShader.buildKernel(sigma);
            this.materialConvolution = new v3d.ShaderMaterial({
                uniforms: this.convolutionUniforms,
                vertexShader: convolutionShader.vertexShader,
                fragmentShader: convolutionShader.fragmentShader,
                defines: {
                    'KERNEL_SIZE_FLOAT': kernelSize.toFixed(1),
                    'KERNEL_SIZE_INT': kernelSize.toFixed(0)
                }
            });
            this.needsSwap = false;
            this.fsQuad = new v3d.FullScreenQuad(null);

        }

        render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {

            if (maskActive) renderer.state.buffers.stencil.setTest(false); // Render quad with blured scene into texture (convolution pass 1)

            this.fsQuad.material = this.materialConvolution;
            this.convolutionUniforms['tDiffuse'].value = readBuffer.texture;
            this.convolutionUniforms['uImageIncrement'].value = BloomPass.blurX;
            renderer.setRenderTarget(this.renderTargetX);
            renderer.clear();
            this.fsQuad.render(renderer); // Render quad with blured scene into texture (convolution pass 2)

            this.convolutionUniforms['tDiffuse'].value = this.renderTargetX.texture;
            this.convolutionUniforms['uImageIncrement'].value = BloomPass.blurY;
            renderer.setRenderTarget(this.renderTargetY);
            renderer.clear();
            this.fsQuad.render(renderer); // Render original scene with superimposed blur to texture

            this.fsQuad.material = this.materialCopy;
            this.copyUniforms['tDiffuse'].value = this.renderTargetY.texture;
            if (maskActive) renderer.state.buffers.stencil.setTest(true);
            renderer.setRenderTarget(readBuffer);
            if (this.clear) renderer.clear();
            this.fsQuad.render(renderer);

        }

    }

    BloomPass.blurX = new v3d.Vector2(0.001953125, 0.0);
    BloomPass.blurY = new v3d.Vector2(0.0, 0.001953125);

    v3d.BloomPass = BloomPass;

})();
