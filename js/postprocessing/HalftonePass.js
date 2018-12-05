/**
 * @author meatbags / xavierburrow.com, github/meatbags
 *
 * RGB Halftone pass for three.js effects composer. Requires v3d.HalftoneShader.
 *
 */

v3d.HalftonePass = function(width, height, params) {

    v3d.Pass.call(this);

     if (v3d.HalftoneShader === undefined) {

         console.error('v3d.HalftonePass requires v3d.HalftoneShader');

     }

     this.uniforms = v3d.UniformsUtils.clone(v3d.HalftoneShader.uniforms);
     this.material = new v3d.ShaderMaterial({
         uniforms: this.uniforms,
         fragmentShader: v3d.HalftoneShader.fragmentShader,
         vertexShader: v3d.HalftoneShader.vertexShader
     });

    // set params
    this.uniforms.width.value = width;
    this.uniforms.height.value = height;

    for (var key in params) {

        if (params.hasOwnProperty(key) && this.uniforms.hasOwnProperty(key)) {

            this.uniforms[key].value = params[key];

        }

    }

     this.camera = new v3d.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
     this.scene = new v3d.Scene();
     this.quad = new v3d.Mesh(new v3d.PlaneBufferGeometry(2, 2), null);
     this.quad.frustumCulled = false;
     this.scene.add(this.quad);

 };

 v3d.HalftonePass.prototype = Object.assign(Object.create(v3d.Pass.prototype), {

    constructor: v3d.HalftonePass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {

         this.material.uniforms["tDiffuse"].value = readBuffer.texture;
         this.quad.material = this.material;

         if (this.renderToScreen) {

             renderer.render(this.scene, this.camera);

        } else {

            renderer.render(this.scene, this.camera, writeBuffer, this.clear);

        }

     },

     setSize: function(width, height) {

         this.uniforms.width.value = width;
         this.uniforms.height.value = height;

     }
});
