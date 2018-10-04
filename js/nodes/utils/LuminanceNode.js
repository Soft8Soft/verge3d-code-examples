/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.LuminanceNode = function(rgb) {

    v3d.TempNode.call(this, 'fv1');

    this.rgb = rgb;

};

v3d.LuminanceNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.LuminanceNode.prototype.constructor = v3d.LuminanceNode;

v3d.LuminanceNode.prototype.generate = function(builder, output) {

    builder.include('luminance_rgb');

    return builder.format('luminance_rgb(' + this.rgb.build(builder, 'v3') + ')', this.getType(builder), output);

};
