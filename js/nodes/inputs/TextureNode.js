/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.TextureNode = function(value, coord, bias, project) {

    v3d.InputNode.call(this, 'v4', { shared : true });

    this.value = value;
    this.coord = coord || new v3d.UVNode();
    this.bias = bias;
    this.project = project !== undefined ? project : false;

};

v3d.TextureNode.prototype = Object.create(v3d.InputNode.prototype);
v3d.TextureNode.prototype.constructor = v3d.TextureNode;

v3d.TextureNode.prototype.getTexture = function(builder, output) {

    return v3d.InputNode.prototype.generate.call(this, builder, output, this.value.uuid, 't');

};

v3d.TextureNode.prototype.generate = function(builder, output) {

    if (output === 'sampler2D') {

        return this.getTexture(builder, output);

    }

    var tex = this.getTexture(builder, output);
    var coord = this.coord.build(builder, this.project ? 'v4' : 'v2');
    var bias = this.bias ? this.bias.build(builder, 'fv1') : undefined;

    if (bias == undefined && builder.requires.bias) {

        bias = builder.requires.bias.build(builder, 'fv1');

    }

    var method, code;

    if (this.project) method = 'texture2DProj';
    else method = bias ? 'tex2DBias' : 'tex2D';

    if (bias) code = method + '(' + tex + ',' + coord + ',' + bias + ')';
    else code = method + '(' + tex + ',' + coord + ')';

    if (builder.isSlot('color')) {

        code = 'mapTexelToLinear(' + code + ')';

    } else if (builder.isSlot('emissive')) {

        code = 'emissiveMapTexelToLinear(' + code + ')';

    } else if (builder.isSlot('environment')) {

        code = 'envMapTexelToLinear(' + code + ')';

    }

    return builder.format(code, this.type, output);

};
