/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.FunctionCallNode = function(func, inputs) {

    v3d.TempNode.call(this);

    this.setFunction(func, inputs);

};

v3d.FunctionCallNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.FunctionCallNode.prototype.constructor = v3d.FunctionCallNode;

v3d.FunctionCallNode.prototype.setFunction = function(func, inputs) {

    this.value = func;
    this.inputs = inputs || [];

};

v3d.FunctionCallNode.prototype.getFunction = function() {

    return this.value;

};

v3d.FunctionCallNode.prototype.getType = function(builder) {

    return this.value.getType(builder);

};

v3d.FunctionCallNode.prototype.generate = function(builder, output) {

    var material = builder.material;

    var type = this.getType(builder);
    var func = this.value;

    var code = func.build(builder, output) + '(';
    var params = [];

    for (var i = 0; i < func.inputs.length; i++) {

        var inpt = func.inputs[i];
        var param = this.inputs[i] || this.inputs[inpt.name];

        params.push(param.build(builder, builder.getTypeByFormat(inpt.type)));

    }

    code += params.join(',') + ')';

    return builder.format(code, type, output);

};
