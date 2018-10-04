/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.VarNode = function(type) {

    v3d.GLNode.call(this, type);

};

v3d.VarNode.prototype = Object.create(v3d.GLNode.prototype);
v3d.VarNode.prototype.constructor = v3d.VarNode;

v3d.VarNode.prototype.getType = function(builder) {

    return builder.getTypeByFormat(this.type);

};

v3d.VarNode.prototype.generate = function(builder, output) {

    var varying = builder.material.getVar(this.uuid, this.type);

    return builder.format(varying.name, this.getType(builder), output);

};
