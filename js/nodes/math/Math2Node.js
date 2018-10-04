/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Math2Node = function(a, b, method) {

    v3d.TempNode.call(this);

    this.a = a;
    this.b = b;

    this.method = method || v3d.Math2Node.DISTANCE;

};

v3d.Math2Node.MIN = 'min';
v3d.Math2Node.MAX = 'max';
v3d.Math2Node.MOD = 'mod';
v3d.Math2Node.STEP = 'step';
v3d.Math2Node.REFLECT = 'reflect';
v3d.Math2Node.DISTANCE = 'distance';
v3d.Math2Node.DOT = 'dot';
v3d.Math2Node.CROSS = 'cross';
v3d.Math2Node.POW = 'pow';

v3d.Math2Node.prototype = Object.create(v3d.TempNode.prototype);
v3d.Math2Node.prototype.constructor = v3d.Math2Node;

v3d.Math2Node.prototype.getInputType = function(builder) {

    // use the greater length vector
    if (builder.getFormatLength(this.b.getType(builder)) > builder.getFormatLength(this.a.getType(builder))) {

        return this.b.getType(builder);

    }

    return this.a.getType(builder);

};

v3d.Math2Node.prototype.getType = function(builder) {

    switch (this.method) {
        case v3d.Math2Node.DISTANCE:
        case v3d.Math2Node.DOT:
            return 'fv1';

        case v3d.Math2Node.CROSS:
            return 'v3';
    }

    return this.getInputType(builder);

};

v3d.Math2Node.prototype.generate = function(builder, output) {

    var material = builder.material;

    var type = this.getInputType(builder);

    var a, b,
        al = builder.getFormatLength(this.a.getType(builder)),
        bl = builder.getFormatLength(this.b.getType(builder));

    // optimzer

    switch (this.method) {
        case v3d.Math2Node.CROSS:
            a = this.a.build(builder, 'v3');
            b = this.b.build(builder, 'v3');
            break;

        case v3d.Math2Node.STEP:
            a = this.a.build(builder, al == 1 ? 'fv1' : type);
            b = this.b.build(builder, type);
            break;

        case v3d.Math2Node.MIN:
        case v3d.Math2Node.MAX:
        case v3d.Math2Node.MOD:
            a = this.a.build(builder, type);
            b = this.b.build(builder, bl == 1 ? 'fv1' : type);
            break;

        default:
            a = this.a.build(builder, type);
            b = this.b.build(builder, type);
            break;

    }

    return builder.format(this.method + '(' + a + ',' + b + ')', this.getType(builder), output);

};
