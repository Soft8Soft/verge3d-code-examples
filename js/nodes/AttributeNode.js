/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.AttributeNode = function(name, type) {

    v3d.GLNode.call(this, type);

    this.name = name;

};

v3d.AttributeNode.prototype = Object.create(v3d.GLNode.prototype);
v3d.AttributeNode.prototype.constructor = v3d.AttributeNode;

v3d.AttributeNode.prototype.getAttributeType = function(builder) {

    return typeof this.type === 'number' ? builder.getConstructorFromLength(this.type) : this.type;

};

v3d.AttributeNode.prototype.getType = function(builder) {

    var type = this.getAttributeType(builder);

    return builder.getTypeByFormat(type);

};

v3d.AttributeNode.prototype.generate = function(builder, output) {

    var type = this.getAttributeType(builder);

    var attribute = builder.material.getAttribute(this.name, type);

    return builder.format(builder.isShader('vertex') ? this.name : attribute.varying.name, this.getType(builder), output);

};
