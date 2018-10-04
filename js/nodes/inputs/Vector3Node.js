/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Vector3Node = function(x, y, z) {

    v3d.InputNode.call(this, 'v3');

    this.type = 'v3';
    this.value = new v3d.Vector3(x, y, z);

};

v3d.Vector3Node.prototype = Object.create(v3d.InputNode.prototype);
v3d.Vector3Node.prototype.constructor = v3d.Vector3Node;

v3d.NodeMaterial.addShortcuts(v3d.Vector3Node.prototype, 'value', ['x', 'y', 'z']);
