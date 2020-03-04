/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.GlitchPass = function(dt_size) {

    v3d.Pass.call(this);

    if (v3d.DigitalGlitch === undefined) console.error("v3d.GlitchPass relies on v3d.DigitalGlitch");

    var shader = v3d.DigitalGlitch;
    this.uniforms = v3d.UniformsUtils.clone(shader.uniforms);

    if (dt_size == undefined) dt_size = 64;


    this.uniforms["tDisp"].value = this.generateHeightmap(dt_size);


    this.material = new v3d.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
    });

    this.fsQuad = new v3d.Pass.FullScreenQuad(this.material);

    this.goWild = false;
    this.curF = 0;
    this.generateTrigger();

};

v3d.GlitchPass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.GlitchPass,

    render: function(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

        this.uniforms["tDiffuse"].value = readBuffer.texture;
        this.uniforms['seed'].value = Math.random();//default seeding
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

    },

    generateTrigger: function() {

        this.randX = v3d.MathUtils.randInt(120, 240);

    },

    generateHeightmap: function(dt_size) {

        var data_arr = new Float32Array(dt_size * dt_size * 3);
        var length = dt_size * dt_size;

        for (var i = 0; i < length; i++) {

            var val = v3d.MathUtils.randFloat(0, 1);
            data_arr[i * 3 + 0] = val;
            data_arr[i * 3 + 1] = val;
            data_arr[i * 3 + 2] = val;

        }

        return new v3d.DataTexture(data_arr, dt_size, dt_size, v3d.RGBFormat, v3d.FloatType);

    }

});
