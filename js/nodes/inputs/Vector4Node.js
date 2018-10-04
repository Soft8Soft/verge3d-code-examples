/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Vector4Node = function(x, y, z, w) {

    v3d.InputNode.call(this, 'v4');

    this.value = new v3d.Vector4(x, y, z, w);

};

v3d.Vector4Node.prototype = Object.create(v3d.InputNode.prototype);
v3d.Vector4Node.prototype.constructor = v3d.Vector4Node;

v3d.NodeMaterial.addShortcuts(v3d.Vector4Node.prototype, 'value', ['x', 'y', 'z', 'w']);
