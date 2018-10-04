/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ColorNode = function(color) {

    v3d.InputNode.call(this, 'c');

    this.value = new v3d.Color(color || 0);

};

v3d.ColorNode.prototype = Object.create(v3d.InputNode.prototype);
v3d.ColorNode.prototype.constructor = v3d.ColorNode;

v3d.NodeMaterial.addShortcuts(v3d.ColorNode.prototype, 'value', ['r', 'g', 'b']);
