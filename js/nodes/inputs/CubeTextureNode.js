/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.CubeTextureNode = function(value, coord, bias) {

    v3d.InputNode.call(this, 'v4', { shared : true });

    this.value = value;
    this.coord = coord || new v3d.ReflectNode();
    this.bias = bias;

};

v3d.CubeTextureNode.prototype = Object.create(v3d.InputNode.prototype);
v3d.CubeTextureNode.prototype.constructor = v3d.CubeTextureNode;

v3d.CubeTextureNode.prototype.getTexture = function(builder, output) {

    return v3d.InputNode.prototype.generate.call(this, builder, output, this.value.uuid, 't');

};

v3d.CubeTextureNode.prototype.generate = function(builder, output) {

    if (output === 'samplerCube') {

        return this.getTexture(builder, output);

    }

    var cubetex = this.getTexture(builder, output);
    var coord = this.coord.build(builder, 'v3');
    var bias = this.bias ? this.bias.build(builder, 'fv1') : undefined;

    if (bias == undefined && builder.requires.bias) {

        bias = builder.requires.bias.build(builder, 'fv1');

    }

    var code;

    if (bias) code = 'texCubeBias(' + cubetex + ',' + coord + ',' + bias + ')';
    else code = 'texCube(' + cubetex + ',' + coord + ')';

    if (builder.isSlot('color')) {

        code = 'mapTexelToLinear(' + code + ')';

    } else if (builder.isSlot('emissive')) {

        code = 'emissiveMapTexelToLinear(' + code + ')';

    } else if (builder.isSlot('environment')) {

        code = 'envMapTexelToLinear(' + code + ')';

    }

    return builder.format(code, this.type, output);

};
