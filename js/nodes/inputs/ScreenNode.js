/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ScreenNode = function(coord) {

    v3d.TextureNode.call(this, undefined, coord);

};

v3d.ScreenNode.prototype = Object.create(v3d.TextureNode.prototype);
v3d.ScreenNode.prototype.constructor = v3d.ScreenNode;

v3d.ScreenNode.prototype.isUnique = function() {

    return true;

};

v3d.ScreenNode.prototype.getTexture = function(builder, output) {

    return v3d.InputNode.prototype.generate.call(this, builder, output, this.getUuid(), 't', 'renderTexture');

};
