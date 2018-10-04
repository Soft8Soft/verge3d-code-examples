/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Vector2Node = function(x, y) {

    v3d.InputNode.call(this, 'v2');

    this.value = new v3d.Vector2(x, y);

};

v3d.Vector2Node.prototype = Object.create(v3d.InputNode.prototype);
v3d.Vector2Node.prototype.constructor = v3d.Vector2Node;

v3d.NodeMaterial.addShortcuts(v3d.Vector2Node.prototype, 'value', ['x', 'y']);
