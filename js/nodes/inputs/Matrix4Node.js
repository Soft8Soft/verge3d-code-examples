/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Matrix4Node = function(matrix) {

    v3d.InputNode.call(this, 'm4');

    this.value = matrix || new v3d.Matrix4();

};

v3d.Matrix4Node.prototype = Object.create(v3d.InputNode.prototype);
v3d.Matrix4Node.prototype.constructor = v3d.Matrix4Node;
