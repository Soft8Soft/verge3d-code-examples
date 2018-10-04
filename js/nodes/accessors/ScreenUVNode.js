/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ScreenUVNode = function(resolution) {

    v3d.TempNode.call(this, 'v2');

    this.resolution = resolution;

};

v3d.ScreenUVNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.ScreenUVNode.prototype.constructor = v3d.ScreenUVNode;

v3d.ScreenUVNode.prototype.generate = function(builder, output) {

    var material = builder.material;
    var result;

    if (builder.isShader('fragment')) {

        result = '(gl_FragCoord.xy/' + this.resolution.build(builder, 'v2') + ')';

    } else {

        console.warn("v3d.ScreenUVNode is not compatible with " + builder.shader + " shader.");

        result = 'vec2(0.0)';

    }

    return builder.format(result, this.getType(builder), output);

};
