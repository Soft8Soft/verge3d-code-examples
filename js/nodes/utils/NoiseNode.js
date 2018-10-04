/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.NoiseNode = function(coord) {

    v3d.TempNode.call(this, 'fv1');

    this.coord = coord;

};

v3d.NoiseNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.NoiseNode.prototype.constructor = v3d.NoiseNode;

v3d.NoiseNode.prototype.generate = function(builder, output) {

    builder.include('snoise');

    return builder.format('snoise(' + this.coord.build(builder, 'v2') + ')', this.getType(builder), output);

};
