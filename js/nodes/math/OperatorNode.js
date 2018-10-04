/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.OperatorNode = function(a, b, op) {

    v3d.TempNode.call(this);

    this.a = a;
    this.b = b;
    this.op = op || v3d.OperatorNode.ADD;

};

v3d.OperatorNode.ADD = '+';
v3d.OperatorNode.SUB = '-';
v3d.OperatorNode.MUL = '*';
v3d.OperatorNode.DIV = '/';

v3d.OperatorNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.OperatorNode.prototype.constructor = v3d.OperatorNode;

v3d.OperatorNode.prototype.getType = function(builder) {

    var a = this.a.getType(builder);
    var b = this.b.getType(builder);

    if (builder.isFormatMatrix(a)) {

        return 'v4';

    } else if (builder.getFormatLength(b) > builder.getFormatLength(a)) {

        // use the greater length vector

        return b;

    }

    return a;

};

v3d.OperatorNode.prototype.generate = function(builder, output) {

    var material = builder.material,
        data = material.getDataNode(this.uuid);

    var type = this.getType(builder);

    var a = this.a.build(builder, type);
    var b = this.b.build(builder, type);

    return builder.format('(' + a + this.op + b + ')', type, output);

};
